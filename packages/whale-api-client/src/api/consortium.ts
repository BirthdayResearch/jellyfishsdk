import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'
import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for consortium related services.
 */
export class Consortium {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   *  Gets the asset breakdown information of consortium members.
   *
   * @return {Promise<AssetBreakdownInfo[]>}
    */
  async getAssetBreakdown (): Promise<AssetBreakdownInfo[]> {
    return await this.client.requestData('GET', 'consortium/assetbreakdown')
  }

  /**
   *  Gets the stats information of a specific consortium member
   *
   * @return {Promise<MemberStatsInfo[]>}
    */
  async getMemberStats (memberid: string): Promise<MemberStatsInfo[]> {
    return await this.client.requestData('GET', `consortium/stats/${memberid}`)
  }

  /**
   *  Gets the transaction history of consortium members.
   *
   * @param {number} [pageIndex] The starting index for pagination
   * @param {number} [limit] How many transactions to fetch
   * @param {string} [searchTerm] Search term, can be a transaction id, member/owner address or name
   * @return {Promise<ConsortiumTransactionResponse[]>}
    */
  async getTransactionHistory (next?: number, size?: number, searchTerm?: string): Promise<ConsortiumTransactionResponse> {
    const query = []

    if (next !== undefined) {
      query.push(`next=${next}`)
    }

    if (size !== undefined) {
      query.push(`size=${size}`)
    }

    if (searchTerm !== undefined) {
      query.push(`searchTerm=${searchTerm}`)
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

export interface MemberDetail {
  id: string
  backingId?: string
  ownerAddress: string
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

export interface TokenWithMintStatsInfo extends TokenInfo {
  id: string
  mintStats: MintStatsInfo
}

export interface MintStatsInfo {
  minted: string
  mintedDaily: string
  mintLimit: string
  mintDailyLimit: string
}

export interface MintTokenWithStats {
  tokenSymbol: string
  tokenDisplaySymbol: string
  tokenId: string
  member: MintStatsInfo
  token: MintStatsInfo
}

export interface MemberStatsInfo {
  memberId: string
  memberName: string
  mintTokens: MintTokenWithStats[]
}
