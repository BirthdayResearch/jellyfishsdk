import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for consortium related services.
 */
export class Consortium {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   *  Gets the asset breakdown information for consortium members.
   *
   * @return {Promise<AssetBreakdownInfo[]>}
    */
  async getAssetBreakdown (): Promise<AssetBreakdownInfo> {
    return await this.client.requestData('GET', 'consortium/assetbreakdown')
  }
}

export interface MemberInfo {
  id: string
  name: string
  backingAddress: string
}

export interface MemberWithTokenInfo extends MemberInfo {
  minted: string
  backed: string
  burnt: string
  supply: string
}

export interface AssetBreakdownInfo {
  tokenSymbol: string
  memberInfo: MemberWithTokenInfo[]
}
