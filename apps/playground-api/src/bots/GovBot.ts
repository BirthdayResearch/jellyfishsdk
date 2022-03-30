import { ApiClient } from '@defichain/jellyfish-api-core'
import { TokenResult } from '@defichain/jellyfish-api-core/src/category/token'
import { Injectable } from '@nestjs/common'

@Injectable()
export class GovBot {
  constructor (readonly client: ApiClient) {
  }

  // @Interval(6000)
  async run (): Promise<void> {
    const tokens = await this.client.token.listTokens()
    for (const id of Object.keys(tokens)) {
      if (tokens[id].isLoanToken) {
        await this.enablePayback(id, tokens)
      }
    }
  }

  /**
   * Enable payback for all tokens
   * @param {string} loanTokenId
   * @return {Promise<void>}
   */
  async enablePayback (loanTokenId: string, tokens: TokenResult): Promise<void> {
    for (const tokenId of Object.keys(tokens)) {
      if (loanTokenId === tokenId || !tokens[tokenId].isDAT || tokens[tokenId].isLPS) {
        continue
      }

      const paybackKey = `v0/token/${loanTokenId}/loan_payback/${tokenId}`
      const penaltyRateKey = `v0/token/${loanTokenId}/loan_payback_fee_pct/${tokenId}`

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
