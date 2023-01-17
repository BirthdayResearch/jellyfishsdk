import { Injectable, NotFoundException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { DeFiDCache, TokenInfoWithId } from './cache/defid.cache'
import { AssetBreakdownInfo, MemberDetail, MemberWithTokenInfo, MemberMintStatsInfo, TokenWithMintStatsInfo, MintTokenWithStats } from '@defichain/whale-api-client/dist/api/consortium'
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

  private getGlobalMintStatsPerToken (tokens: TokenInfoWithId[], attrs: any, keys: string[]): TokenWithMintStatsInfo[] {
    const limitKeyRegex = /^v0\/consortium\/\d+\/mint_limit$/
    const tokensWithMintStat: TokenWithMintStatsInfo[] = keys.filter(k => limitKeyRegex.exec(k) !== null).reduce((acc: any[], curr: string) => {
      const tokenId = curr.split('/')[2]
      const token = tokens.find(t => t.id === tokenId)
      if (token === undefined) {
        return acc
      }

      const mintLimit = attrs[curr]
      const mintDailyLimit = attrs[`v0/consortium/${tokenId}/mint_limit_daily`]
      const mintedAmount = attrs[`v0/live/economy/consortium/${tokenId}/minted`]
      const mintedDailyAmount = this.getGlobalDailyMintedAmountPerToken(attrs, tokenId)

      const tokenWithMint: TokenWithMintStatsInfo = {
        ...token,
        mintStats: {
          minted: new BigNumber(mintedAmount ?? '0').toFixed(+token.decimal.toString()),
          mintedDaily: new BigNumber(mintedDailyAmount ?? '0').toFixed(+token.decimal.toString()),
          mintLimit: mintLimit ?? '0',
          mintDailyLimit: mintDailyLimit ?? '0'
        }
      }
      acc.push(tokenWithMint)
      return acc
    }, [])
    return tokensWithMintStat
  }

  private getGlobalDailyMintedAmountPerToken (attrs: any, tokenId: string): BigNumber {
    let globalDailyMinted = new BigNumber(0)
    const dailyMintedRegex = /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/daily_minted$/
    const keys = Object.keys(attrs)

    keys.forEach(key => {
      if (dailyMintedRegex.exec(key) === null) {
        return
      }

      const mintTokenId = key.split('/')[4]
      if (mintTokenId === undefined || mintTokenId !== tokenId) {
        return
      }

      const dailyMinted = attrs[key]
      const dailyMintedAmount = dailyMinted?.split('/')[1] ?? '0'
      globalDailyMinted = globalDailyMinted.plus(dailyMintedAmount)
    })

    return globalDailyMinted
  }

  private getTokenMintInfo (attrs: any, tokenId: string, token: TokenWithMintStatsInfo, memberId: string, member: any): MintTokenWithStats {
    const mintedAmount = attrs[`v0/live/economy/consortium_members/${tokenId}/${memberId}/minted`] ?? '0'
    const dailyMinted = attrs[`v0/live/economy/consortium_members/${tokenId}/${memberId}/daily_minted`]
    const dailyMintedAmount = dailyMinted?.split('/')[1] ?? '0'

    const tokenMintInfo = {
      tokenSymbol: token.symbol,
      tokenDisplaySymbol: parseDisplaySymbol(token),
      tokenId: token.id,
      member: {
        minted: new BigNumber(mintedAmount).toFixed(+token.decimal.toString()),
        mintedDaily: new BigNumber(dailyMintedAmount).toFixed(+token.decimal.toString()),
        mintLimit: new BigNumber(member.mintLimit).toFixed(+token.decimal.toString()),
        mintDailyLimit: new BigNumber(member.mintLimitDaily).toFixed(+token.decimal.toString())
      },
      global: {
        minted: token.mintStats.minted,
        mintedDaily: new BigNumber(token.mintStats.mintedDaily).toFixed(+token.decimal.toString()),
        mintLimit: new BigNumber(token.mintStats.mintLimit).toFixed(+token.decimal.toString()),
        mintDailyLimit: new BigNumber(token.mintStats.mintDailyLimit).toFixed(+token.decimal.toString())
      }
    }

    return tokenMintInfo
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
    const memberAttrs = keys.filter((key) => {
      const matchesMemberAttr = membersKeyRegex.exec(key) !== null
      const matchesMemberId = Object.keys(attrs[key]).some(id => id === memberId)
      return matchesMemberAttr && matchesMemberId
    })
    if (memberAttrs === undefined || memberAttrs.length === 0) {
      throw new NotFoundException('Consortium member not found')
    }

    const tokens: TokenInfoWithId[] = await this.defidCache.getAllTokenInfo() as TokenInfoWithId[]
    const tokensWithMintInfo = this.getGlobalMintStatsPerToken(tokens, attrs, keys)

    const mintStats: MemberMintStatsInfo = { memberId: '', memberName: '', mintTokens: [] }
    memberAttrs.forEach(attrKey => {
      const member = attrs[attrKey][memberId]
      if (mintStats.memberId === '') {
        mintStats.memberId = memberId
        mintStats.memberName = member.name
      }

      const tokenId = attrKey.split('/')[2]
      const token = tokensWithMintInfo.find((t: TokenWithMintStatsInfo) => t.id === tokenId)
      if (token === undefined) {
        return
      }

      const tokenMintInfo = this.getTokenMintInfo(attrs, tokenId, token, memberId, member)
      mintStats.mintTokens.push(tokenMintInfo)
    })

    return mintStats
  }
}
