import { ApiClient } from '@defichain/jellyfish-api-core'
import { Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'

@Injectable()
export class GovBot {
  public tokenIds: string[] = []
  public loanTokenIds: string[] = []

  constructor (readonly client: ApiClient) {
  }

  @Interval(6000)
  async run (): Promise<void> {
    for (const tokenId of this.tokenIds) {
      await this.enablePayback(tokenId)
    }
  }

  /**
   * Enable payback for all tokens
   * @param {string} fromTokenId payback token Id
   * @return {Promise<void>}
   */
  async enablePayback (fromTokenId: string): Promise<void> {
    for (const tokenId of this.tokenIds) {
      if (tokenId === fromTokenId) {
        continue
      }
      // const paybackKey = `v0/token/${tokenId}/payback_dfi`
      // const penaltyRateKey = `v0/token/${tokenId}/payback_dfi_fee_pct`
      const paybackKey = `v0/token/${tokenId}/loan_payback/${fromTokenId}`
      const penaltyRateKey = `v0/token/${tokenId}/loan_payback_fee_pct/${fromTokenId}`

      await this.client.masternode.setGov(
        {
          ATTRIBUTES: {
            [paybackKey]: 'true',
            [penaltyRateKey]: '0.01' // default penalty rate
          }
        }
      )
    }
  }
}
