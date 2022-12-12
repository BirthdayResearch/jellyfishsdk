import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for consortium related services.
 */
export class Consortium {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   *  Gets the transaction history of consortium members.
   * @param {number} limit how many transactions to fetch
   * @param {string} [search] search term, can be a transaction id, member/owner address or member name
   * @param {number} [maxBlockHeight] the maximum block height to look for, -1 for current tip by default
   * @return {Promise<ConsortiumTransactionResponse[]>}
    */
  async getTransactionHistory (limit: number, search?: string, maxBlockHeight?: number): Promise<ConsortiumTransactionResponse> {
    const query = []

    if (limit !== undefined) {
      query.push(`limit=${limit}`)
    }

    if (search !== undefined) {
      query.push(`search=${search}`)
    }

    if (maxBlockHeight !== undefined) {
      query.push(`maxBlockHeight=${maxBlockHeight}`)
    }

    return await this.client.requestData('GET', `consortium/transactions?${query.join('&')}`)
  }
}

export interface ConsortiumTransactionResponse {
  transactions: Transaction[]
  total: number
}

export interface Transaction {
  type: 'Mint' | 'Burn'
  member: string
  tokenAmounts: Array<{ token: string, amount: string }>
  txId: string
  address: string
  block: number
}

export interface ConsortiumMember {
  id: string
  name: string
  address: string
}

export interface MemberDetail {
  backingId: string
  name: string
}

export interface MemberInfo {
  tokenId: string
  id: string
  name: string
  backingAddresses: string[]
}

export interface MemberWithTokenInfo extends MemberInfo {
  minted: string
  burned: string
}

export interface AssetBreakdownInfo {
  tokenSymbol: string
  tokenDisplaySymbol: string
  memberInfo: MemberWithTokenInfo[]
}
