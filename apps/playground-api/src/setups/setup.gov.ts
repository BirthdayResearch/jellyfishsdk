import { PlaygroundSetup } from '../setups/setup'
import { Injectable } from '@nestjs/common'

@Injectable()
export class SetupGov extends PlaygroundSetup<Record<string, any>> {
  list (): Array<Record<string, any>> {
    return [
      {
        ATTRIBUTES: {
          // dfi pay dtoken
          // DFI pay DUSD
          'v0/token/12/payback_dfi': 'true',
          'v0/token/12/payback_dfi_fee_pct': '0.01',

          // DFI pay TR50
          'v0/token/16/payback_dfi': 'true',
          'v0/token/16/payback_dfi_fee_pct': '0.01',

          // dtoken (DUSD) pay dtoken #1
          // DUSD pay TD10
          'v0/token/14/loan_payback/12': 'true',
          'v0/token/14/loan_payback_fee_pct/12': '0.01',

          // DUSD pay TU10
          'v0/token/13/loan_payback/12': 'true',
          'v0/token/13/loan_payback_fee_pct/12': '0.01',

          // DUSD pay TR50
          'v0/token/16/loan_payback/12': 'true',
          'v0/token/16/loan_payback_fee_pct/12': '0.01',

          // dtoken pay dtoken #2
          // TD10 pay DUSD
          'v0/token/12/loan_payback/14': 'true',
          'v0/token/12/loan_payback_fee_pct/14': '0.01',

          // TD10 pay TR50
          'v0/token/16/loan_payback/14': 'true',
          'v0/token/16/loan_payback_fee_pct/14': '0.01',

          // TU10 pay TS25
          'v0/token/15/loan_payback/13': 'true',
          'v0/token/15/loan_payback_fee_pct/13': '0.01',

          // cToken pay dToken
          // BTC pay TD10
          'v0/token/14/loan_payback/1': 'true',
          'v0/token/14/loan_payback_fee_pct/1': '0.01',

          // BTC pay DUSD
          'v0/token/12/loan_payback/1': 'true',
          'v0/token/12/loan_payback_fee_pct/1': '0.01',

          // CU10 pay TU10
          'v0/token/13/loan_payback/6': 'true',
          'v0/token/13/loan_payback_fee_pct/6': '0.01'
        }
      }
    ]
  }

  async create (each: any): Promise<void> {
    await this.client.masternode.setGov(each)
  }

  async has (each: any): Promise<boolean> {
    const key = Object.keys(each)[0]
    const gov = await this.client.masternode.getGov(key)
    if (Object.keys(gov[key]).length > 0) {
      return true
    }
    return false
  }
}
