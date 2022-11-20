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
  burnt: string
}

export interface AssetBreakdownInfo {
  tokenSymbol: string
  memberInfo: MemberWithTokenInfo[]
}
