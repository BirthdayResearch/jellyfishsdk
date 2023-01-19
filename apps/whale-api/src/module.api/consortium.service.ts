import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import {
  ConsortiumTransactionResponse,
  Transaction,
  AssetBreakdownInfo,
  MemberDetail,
  MemberWithTokenInfo
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
}
