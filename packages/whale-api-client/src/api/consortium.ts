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
   *  Gets the mint stats information of a specific consortium member
   *
   * @return {Promise<MemberMintStatsInfo[]>}
    */
  async getMemberMintStats (memberid: string): Promise<MemberMintStatsInfo[]> {
    return await this.client.requestData('GET', `consortium/mintstats/${memberid}`)
  }
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
  global: MintStatsInfo
}

export interface MemberMintStatsInfo {
  memberId: string
  memberName: string
  mintTokens: MintTokenWithStats[]
}

export interface TokenWithMintStatsInfo extends TokenInfo {
  id: string
  mintStats: MintStatsInfo
}
