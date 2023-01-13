import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache, TokenInfoWithId } from './cache/defid.cache'
import { AssetBreakdownInfo, MemberDetail, MemberWithTokenInfo, MemberMintStatsInfo } from '@defichain/whale-api-client/dist/api/consortium'
import BigNumber from 'bignumber.js'
import { parseDisplaySymbol } from './token.controller'

@Injectable()
export class ConsortiumService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    private readonly defidCache: DeFiDCache
  ) {}

  private updateBurnMintAmounts (assetBreakdownInfo: AssetBreakdownInfo[], tokens: TokenInfoWithId[], key: string, value: string): void {
    const tokenId = key.split('/')[4]
    const memberId = key.split('/')[5]
    const type = key.split('/')[6] === 'burnt' ? 'burned' : 'minted'
    const token = tokens.find(t => t.id === tokenId)
    if (token === undefined) {
      return
    }
    const val = new BigNumber(value).toFixed(+token.decimal.toString())

    const existingABI = assetBreakdownInfo.find(abi => abi.tokenSymbol === token.symbol)
    if (existingABI === undefined) {
      return
    }

    const existingMember = existingABI.memberInfo.find(mi => mi.id === memberId && mi.tokenId === token.id)
    if (existingMember === undefined) {
      return
    }

    existingMember[type] = val
  }

  private updateMemberMintAmounts (mintStats: MemberMintStatsInfo, tokens: TokenInfoWithId[], key: string, value: string): void {
    const tokenId = key.split('/')[4]
    const memberId = key.split('/')[5]
    if (memberId !== mintStats.memberId) {
      return
    }
    const existingToken = mintStats.mintTokens.find(t => t.tokenId === tokenId)
    if (existingToken === undefined) {
      return
    }
    const token = tokens.find(t => t.id === tokenId)
    if (token === undefined) {
      return
    }
    const type = key.split('/')[6] === 'daily_minted' ? 'mintedDaily' : 'minted'
    const mintedAmount = type === 'mintedDaily' ? value.split('/')[1] : value
    existingToken[type] = new BigNumber(mintedAmount).toFixed(+token.decimal.toString())
  }

  private pushToAssetBreakdownInfo (assetBreakdownInfo: AssetBreakdownInfo[], memberId: string, memberDetail: MemberDetail, tokenId: string, tokens: TokenInfoWithId[]): void {
    const backingAddresses: string[] = memberDetail.backingId.length > 0 ? memberDetail.backingId.split(',').map(a => a.trim()) : []

    const member: MemberWithTokenInfo = {
      id: memberId,
      name: memberDetail.name,
      minted: '0.00000000',
      burned: '0.00000000',
      backingAddresses,
      tokenId
    }

    const token = tokens.find(t => t.id === tokenId)
    if (token === undefined) {
      return
    }

    const existingABI = assetBreakdownInfo.find(abi => abi.tokenSymbol === token.symbol)
    if (existingABI === undefined) {
      assetBreakdownInfo.push({
        tokenSymbol: token.symbol,
        tokenDisplaySymbol: parseDisplaySymbol(token),
        memberInfo: [member]
      })
      return
    }

    const existingMember = existingABI.memberInfo.find(mi => mi.id === memberId && mi.tokenId === token.id)
    if (existingMember !== undefined) {
      return
    }

    existingABI.memberInfo.push(member)
  }

  async getAssetBreakdown (): Promise<AssetBreakdownInfo[]> {
    const attrs = (await this.rpcClient.masternode.getGov('ATTRIBUTES')).ATTRIBUTES

    const keys: string[] = Object.keys(attrs)
    const values: any[] = Object.values(attrs)
    const assetBreakdownInfo: AssetBreakdownInfo[] = []
    const membersKeyRegex = /^v0\/consortium\/\d+\/members$/
    const mintedKeyRegex = /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/minted$/
    const burntKeyRegex = /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/burnt$/

    const tokens: TokenInfoWithId[] = await this.defidCache.getAllTokenInfo() as TokenInfoWithId[]

    keys.forEach((key, i) => {
      if (membersKeyRegex.exec(key) !== null) {
        const tokenId: string = key.split('/')[2]
        const membersPerToken: object = values[i]
        const memberIds: string[] = Object.keys(membersPerToken)
        const memberDetails: MemberDetail[] = Object.values(membersPerToken)

        memberIds.forEach((memberId, j) => {
          this.pushToAssetBreakdownInfo(assetBreakdownInfo, memberId, memberDetails[j], tokenId, tokens)
        })
      }

      if (mintedKeyRegex.exec(key) !== null || burntKeyRegex.exec(key) !== null) {
        this.updateBurnMintAmounts(assetBreakdownInfo, tokens, key, values[i])
      }
    })

    return assetBreakdownInfo
  }

  async getMemberMintStats (memberId: string): Promise<MemberMintStatsInfo> {
    const attrs = (await this.rpcClient.masternode.getGov('ATTRIBUTES')).ATTRIBUTES

    const keys: string[] = Object.keys(attrs)
    const membersKeyRegex = /^v0\/consortium\/\d+\/members$/
    const mintedKeyRegex = /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/minted$/
    const mintedDailyKeyRegex = /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/daily_minted$/

    const membersAttr = keys.filter((key) => membersKeyRegex.exec(key) !== null)
    const memberIds = membersAttr.map((memberKey) => Object.keys(attrs[memberKey])).flat()
    if (!memberIds.includes(memberId)) {
      throw new Error('Consortium member not found')
    }

    const tokens: TokenInfoWithId[] = await this.defidCache.getAllTokenInfo() as TokenInfoWithId[]
    const mintStats: MemberMintStatsInfo = { memberId: '', memberName: '', mintTokens: [] }

    keys.forEach((key) => {
      const attrValue = attrs[key]
      if (membersKeyRegex.exec(key) !== null) {
        const existingMemberId = Object.keys(attrValue).find((id) => id === memberId)
        if (existingMemberId === undefined) {
          return
        }

        const member = attrValue[existingMemberId]
        if (mintStats.memberId === '') {
          mintStats.memberId = memberId
          mintStats.memberName = member.name
        }

        const tokenId = key.split('/')[2]
        const token = tokens.find(t => t.id === tokenId)
        if (token !== undefined) {
          const tokenDecimal = +token.decimal.toString()
          const tokenMintInfo = {
            tokenSymbol: token.symbol,
            tokenDisplaySymbol: parseDisplaySymbol(token),
            tokenId: tokenId,
            minted: '0.00000000',
            mintedDaily: '0.00000000',
            mintLimit: new BigNumber(member.mintLimit).toFixed(tokenDecimal),
            mintDailyLimit: new BigNumber(member.mintLimitDaily).toFixed(tokenDecimal)
          }
          mintStats.mintTokens.push(tokenMintInfo)
        }
      }

      if (mintedKeyRegex.exec(key) !== null || mintedDailyKeyRegex.exec(key) !== null) {
        this.updateMemberMintAmounts(mintStats, tokens, key, attrValue)
      }
    })

    return mintStats
  }
}
