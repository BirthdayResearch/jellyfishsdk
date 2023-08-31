import { Injectable, NotFoundException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import {
  ConsortiumTransactionResponse,
  Transaction,
  AssetBreakdownInfo,
  MemberDetail,
  MemberWithTokenInfo,
  MemberStatsInfo,
  TokenWithMintStatsInfo,
  MintTokenWithStats
} from '@defichain/whale-api-client/dist/api/consortium'
import { AccountHistory, DfTxType } from '@defichain/jellyfish-api-core/dist/category/account'
import { TransactionMapper } from '../module.model/transaction'
import { DeFiDCache, TokenInfoWithId } from './cache/defid.cache'
import BigNumber from 'bignumber.js'
import { parseDisplaySymbol } from './token.controller'

@Injectable()
export class ConsortiumService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    private readonly defidCache: DeFiDCache,
    protected readonly cache: SemaphoreCache,
    protected readonly transactionMapper: TransactionMapper
  ) {}

  private formatTransactionResponse (tx: AccountHistory, members: MemberDetail[]): Transaction {
    return {
      type: tx.type === 'MintToken' ? 'Mint' : 'Burn',
      member: members.find(m => m.ownerAddress === tx.owner)?.name ?? '',
      tokenAmounts: tx.amounts.map((a: any) => {
        const splits = a.split('@')
        return { token: splits[1], amount: splits[0] }
      }),
      txId: tx.txid,
      address: tx.owner,
      block: tx.blockHeight
    }
  }

  private isValidTxIdFormat (value: string): boolean {
    return /^[0-9a-f]{64}$/.exec(value) !== null
  }

  private async getFilteredUniqueMembers (searchTerm: string): Promise<MemberDetail[]> {
    const attrs = (await this.rpcClient.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    const membersKeyRegex: RegExp = /^v0\/consortium\/\d+\/members$/
    const searchForMemberDetail = searchTerm !== '' && !this.isValidTxIdFormat(searchTerm)

    return (Object.entries(attrs) as [[string, object]]).reduce((prev: MemberDetail[], [key, value]) => {
      if (membersKeyRegex.exec(key) === null) {
        return prev
      }

      (Object.entries(value) as [[string, MemberDetail]]).forEach(([memberId, memberDetail]) => {
        if (searchForMemberDetail) {
          if (!(memberDetail.ownerAddress === searchTerm || memberDetail.name.toLowerCase().includes(searchTerm))) {
            return prev
          }
        }

        if (!prev.some(m => m.id === memberId)) {
          prev.push({
            id: memberId,
            name: memberDetail.name,
            ownerAddress: memberDetail.ownerAddress
          })
        }
      })

      return prev
    }, [])
  }

  private async getSingleHistoryTransactionResponse (searchTerm: string, members: MemberDetail[]): Promise<ConsortiumTransactionResponse> {
    const foundTx = await this.transactionMapper.get(searchTerm)
    if (foundTx === undefined) {
      return {
        transactions: [],
        total: 0
      }
    }

    const relevantTxsOnBlock = await this.rpcClient.account.listAccountHistory(members.map(m => m.ownerAddress), {
      maxBlockHeight: foundTx.block.height,
      depth: 0,
      txtypes: [DfTxType.MINT_TOKEN, DfTxType.BURN_TOKEN]
    })
    const transaction = relevantTxsOnBlock.find(tx => tx.txid === foundTx.txid)
    if (transaction === undefined) {
      return {
        transactions: [],
        total: 0
      }
    }

    return {
      transactions: [this.formatTransactionResponse(transaction, members)],
      total: 1
    }
  }

  private async getPaginatedHistoryTransactionsResponse (pageIndex: number, limit: number, members: MemberDetail[]): Promise<ConsortiumTransactionResponse> {
    const memberAddresses = members.map(m => m.ownerAddress)

    const transactions: AccountHistory[] = await this.rpcClient.account.listAccountHistory(memberAddresses, {
      no_rewards: true,
      txtypes: [DfTxType.MINT_TOKEN, DfTxType.BURN_TOKEN],
      including_start: true,
      start: pageIndex * limit,
      limit
    })

    const totalTxCount = await this.rpcClient.account.historyCount(memberAddresses, { txtypes: [DfTxType.BURN_TOKEN, DfTxType.MINT_TOKEN] })

    return {
      transactions: transactions.map(tx => {
        return this.formatTransactionResponse(tx, members)
      }),
      total: totalTxCount
    }
  }

  async getTransactionHistory (pageIndex: number, limit: number, searchTerm: string): Promise<ConsortiumTransactionResponse> {
    const members = await this.getFilteredUniqueMembers(searchTerm)

    const searchForTxId = searchTerm !== '' && this.isValidTxIdFormat(searchTerm)
    if (searchForTxId) {
      return await this.getSingleHistoryTransactionResponse(searchTerm, members)
    }

    return await this.getPaginatedHistoryTransactionsResponse(pageIndex, limit, members)
  }

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
    const backingAddresses: string[] = memberDetail.backingId !== undefined && memberDetail.backingId.length > 0 ? memberDetail.backingId.split(',').map(a => a.trim()) : []

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

  private getGlobalMintStatsPerToken (tokens: TokenInfoWithId[], attrs: Record<string, any>, keys: string[]): TokenWithMintStatsInfo[] {
    const limitKeyRegex = /^v0\/consortium\/\d+\/mint_limit$/
    const tokensWithMintStat = keys.filter(k => limitKeyRegex.exec(k) !== null).reduce((acc: TokenWithMintStatsInfo[], curr: string) => {
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

  private getGlobalDailyMintedAmountPerToken (attrs: Record<string, any>, tokenId: string): BigNumber {
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

  private getTokenMintInfo (attrs: Record<string, any>, tokenId: string, token: TokenWithMintStatsInfo, memberId: string, member: any): MintTokenWithStats {
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
      token: {
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

  async getMemberStats (memberId: string): Promise<MemberStatsInfo> {
    const attrs: Record<string, any> = (await this.rpcClient.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
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

    const stats: MemberStatsInfo = { memberId: '', memberName: '', mintTokens: [] }
    memberAttrs.forEach(attrKey => {
      const member = attrs[attrKey][memberId]
      if (stats.memberId === '') {
        stats.memberId = memberId
        stats.memberName = member.name
      }

      const tokenId = attrKey.split('/')[2]
      const token = tokensWithMintInfo.find((t: TokenWithMintStatsInfo) => t.id === tokenId)
      if (token === undefined) {
        return
      }

      const tokenMintInfo = this.getTokenMintInfo(attrs, tokenId, token, memberId, member)
      stats.mintTokens.push(tokenMintInfo)
    })

    return stats
  }
}
