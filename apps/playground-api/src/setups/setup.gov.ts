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
          'v0/token/13/loan_payback_fee_pct/6': '0.01',

          // Unloop mechanism for DUSD
          'v0/token/12/loan_payback_collateral': 'true',

          // On-chain governance
          'v0/params/feature/gov': 'true'
        }
      }
    ]
  }

  async create (each: any): Promise<void> {
    await this.client.masternode.setGov(each)
  }

  async has (each: any): Promise<boolean> {
    return false // for just overwrite
  }

  async after (): Promise<void> {
    await this.generate(1)

    // separate the dfip2203 setgov as
    // set dfip2203 in the list above will throw
    // `RpcApiError: 'scriptpubkey (code 64)', code: -26, method: setgov`
    await this.client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2203/reward_pct': '0.05',
        'v0/params/dfip2203/block_period': '20'
      }
    })
    await this.generate(1)

    await this.client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2203/active': 'true'
      }
    })
    await this.generate(1)

    await this.client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2203/active': 'true'
      }
    })
    await this.generate(1)
  }
}
