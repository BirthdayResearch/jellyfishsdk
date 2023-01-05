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

  async getTransactionHistory (pageIndex: number, limit: number, searchTerm: string): Promise<ConsortiumTransactionResponse> {
    const attrs = (await this.rpcClient.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    const searching: boolean = searchTerm !== ''
    const membersKeyRegex: RegExp = /^v0\/consortium\/\d+\/members$/
    const txIdFormatRegex: RegExp = /^[a-z0-9]{64}$/
    let members: MemberDetail[] = []
    let totalTxCount: number = 0
    let searchFound: boolean = false

    for (const [key, value] of Object.entries(attrs)) {
      if (membersKeyRegex.exec(key) === null) {
        continue
      }

      const memberIds: string[] = Object.keys(value as object)
      let memberDetails: MemberDetail[] = Object.values(value as object)

      // Filter members list considering the search term is a member address or a name
      if (searching) {
        const matchingMembers = memberDetails.filter(m => m.ownerAddress === searchTerm || m.name.toLowerCase().includes(searchTerm))
        if (matchingMembers.length > 0) {
          memberDetails = matchingMembers
          searchFound = true
        }
      }

      // Filter unique members
      members = memberDetails.reduce<MemberDetail[]>((prev, curr, index) => {
        const memberId = memberIds[index]
        if (prev.find(m => m.id === memberId) === undefined) {
          prev.push({
            id: memberId,
            name: curr.name,
            ownerAddress: curr.ownerAddress
          })
        }
        return prev
      }, [])
    }

    if (searching && !searchFound) {
      // Evaluating if the search term is a valid txid format
      if (txIdFormatRegex.exec(searchTerm) === null) {
        return {
          total: 0,
          transactions: []
        }
      }

      const foundTx = await this.transactionMapper.get(searchTerm)
      if (foundTx !== undefined) {
        const relevantTxsOnBlock = await this.rpcClient.account.listAccountHistory(members.map(m => m.ownerAddress), {
          maxBlockHeight: foundTx.block.height,
          depth: 0,
          txtypes: [DfTxType.MINT_TOKEN, DfTxType.BURN_TOKEN]
        })
        const transaction = relevantTxsOnBlock.find(tx => tx.txid === foundTx.txid)

        if (transaction === undefined) {
          return {
            total: 0,
            transactions: []
          }
        }

        return {
          total: 1,
          transactions: [this.formatTransactionResponse(transaction, members)]
        }
      }
    }

    const transactions: AccountHistory[] = await this.rpcClient.account.listAccountHistory(members.map(m => m.ownerAddress), {
      txtypes: [DfTxType.MINT_TOKEN, DfTxType.BURN_TOKEN],
      including_start: true,
      start: pageIndex * limit,
      limit
    })

    // Calculate total transaction counts
    const promises = []
    for (let i = 0; i < members.length; i++) {
      promises.push(this.rpcClient.account.historyCount(members[i].ownerAddress, { txtype: DfTxType.BURN_TOKEN }))
      promises.push(this.rpcClient.account.historyCount(members[i].ownerAddress, { txtype: DfTxType.MINT_TOKEN }))
    }
    const counts = await Promise.all(promises)
    totalTxCount = counts.reduce((prev, curr) => {
      return prev + curr
    }, 0)

    return {
      transactions: transactions.map(tx => {
        return this.formatTransactionResponse(tx, members)
      }),
      total: totalTxCount
    }
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
