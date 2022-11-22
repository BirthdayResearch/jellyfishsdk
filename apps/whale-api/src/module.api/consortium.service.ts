import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { ConsortiumMember, ConsortiumTransactionResponse, Transaction } from '@defichain/whale-api-client/dist/api/consortium'
import { AccountHistory, DfTxType } from '@defichain/jellyfish-api-core/dist/category/account'
import { TransactionMapper } from '../module.model/transaction'

@Injectable()
export class ConsortiumService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly cache: SemaphoreCache,
    protected readonly transactionMapper: TransactionMapper
  ) {}

  private formatTransactionResponse (tx: AccountHistory, members: ConsortiumMember[]): Transaction {
    return {
      type: tx.type === 'MintToken' ? 'Mint' : 'Burn',
      member: members.find(m => m.address === tx.owner)?.name ?? '',
      tokenAmounts: tx.amounts.map((a: any) => {
        const splits = a.split('@')
        return { token: splits[1], amount: splits[0] }
      }),
      txId: tx.txid,
      address: tx.owner,
      block: tx.blockHeight
    }
  }

  async getTransactionHistory (limit: number, maxBlockHeight: number, search: string): Promise<ConsortiumTransactionResponse> {
    const attrs = (await this.rpcClient.masternode.getGov('ATTRIBUTES')).ATTRIBUTES
    const members: ConsortiumMember[] = []
    const searching: boolean = search !== ''
    const keys: string[] = Object.keys(attrs)
    const values: string[] = Object.values(attrs)
    const membersKeyRegex: RegExp = /^v0\/consortium\/\d+\/members$/
    let totalTxCount: number = 0
    let searchFound: boolean = false

    keys.forEach((key: string, i: number) => {
      if (membersKeyRegex.exec(key) !== null) {
        const membersPerToken: object = JSON.parse(values[i])
        const memberIds: string[] = Object.keys(membersPerToken)
        let memberDetails: Array<{ ownerAddress: string, name: string }> = Object.values(membersPerToken)

        const foundMembers: Array<{ ownerAddress: string, name: string }> = memberDetails.filter(m => m.ownerAddress === search || m.name.toLowerCase().includes(search))
        if (foundMembers.length > 0) {
          memberDetails = foundMembers
          searchFound = true
        }

        for (let j = 0; j < memberDetails.length; j++) {
          const memberId = memberIds[j]
          if (members.find(m => m.id === memberId) === undefined) {
            members.push({
              id: memberId,
              name: memberDetails[j].name,
              address: memberDetails[j].ownerAddress
            })
          }
        }
      }
    })

    if (searching && !searchFound) {
      const foundTx = await this.transactionMapper.get(search)
      if (foundTx !== undefined) {
        const transactionsOnBlock = await this.rpcClient.account.listAccountHistory('all', { maxBlockHeight: foundTx.block.height, depth: 0 })
        const transaction = transactionsOnBlock.find(tx => tx.txid === foundTx.txid)

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

      return {
        total: 0,
        transactions: []
      }
    }

    let txs: AccountHistory[] = []

    for (let i = 0; i < members.length; i++) {
      const member = members[i]

      const mintTxsPromise = this.rpcClient.account.listAccountHistory(member.address, {
        txtype: DfTxType.MINT_TOKEN,
        maxBlockHeight: maxBlockHeight,
        limit
      })

      const burnTxsPromise = this.rpcClient.account.listAccountHistory(member.address, {
        txtype: DfTxType.BURN_TOKEN,
        maxBlockHeight: maxBlockHeight,
        limit
      })

      const burnTxCountPromise = this.rpcClient.account.historyCount(member.address, { txtype: DfTxType.BURN_TOKEN })
      const mintTxCountPromise = this.rpcClient.account.historyCount(member.address, { txtype: DfTxType.MINT_TOKEN })

      const [mintTxs, burnTxs, burnTxCount, mintTxCount] = await Promise.all([mintTxsPromise, burnTxsPromise, burnTxCountPromise, mintTxCountPromise])

      totalTxCount += burnTxCount + mintTxCount
      txs.push(...mintTxs, ...burnTxs)
    }

    txs = txs.sort((a: any, b: any) => b.blockTime - a.blockTime).slice(0, limit)

    return {
      transactions: txs.map(tx => {
        return this.formatTransactionResponse(tx, members)
      }),
      total: totalTxCount
    }
  }
}
