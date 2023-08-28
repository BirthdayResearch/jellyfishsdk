import { PlaygroundSetup } from '../setups/setup'
import { Injectable } from '@nestjs/common'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { ConsortiumKey } from '../ConsortiumKey'

@Injectable()
export class SetupGov extends PlaygroundSetup<Record<string, any>> {
  consortiumOwnerAddress1: string = ConsortiumKey.address
  consortiumOwnerAddress2: string = RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.address

  list (): Array<Record<string, any>> {
    return [
      {
        ATTRIBUTES: {
          // dfi pay dtoken
          // DFI pay DUSD
          'v0/token/14/payback_dfi': 'true',
          'v0/token/14/payback_dfi_fee_pct': '0.01',

          // DFI pay TR50
          'v0/token/18/payback_dfi': 'true',
          'v0/token/18/payback_dfi_fee_pct': '0.01',

          // dtoken (DUSD) pay dtoken #1
          // DUSD pay TD10
          'v0/token/16/loan_payback/14': 'true',
          'v0/token/16/loan_payback_fee_pct/14': '0.01',

          // DUSD pay TU10
          'v0/token/15/loan_payback/14': 'true',
          'v0/token/15/loan_payback_fee_pct/14': '0.01',

          // DUSD pay TR50
          'v0/token/18/loan_payback/14': 'true',
          'v0/token/18/loan_payback_fee_pct/14': '0.01',

          // dtoken pay dtoken #2
          // TD10 pay DUSD
          'v0/token/14/loan_payback/16': 'true',
          'v0/token/14/loan_payback_fee_pct/16': '0.01',

          // TD10 pay TR50
          'v0/token/18/loan_payback/16': 'true',
          'v0/token/18/loan_payback_fee_pct/16': '0.01',

          // TU10 pay TS25
          'v0/token/17/loan_payback/15': 'true',
          'v0/token/17/loan_payback_fee_pct/15': '0.01',

          // cToken pay dToken
          // BTC pay TD10
          'v0/token/16/loan_payback/1': 'true',
          'v0/token/16/loan_payback_fee_pct/1': '0.01',

          // BTC pay DUSD
          'v0/token/14/loan_payback/1': 'true',
          'v0/token/14/loan_payback_fee_pct/1': '0.01',

          // CU10 pay TU10
          'v0/token/15/loan_payback/6': 'true',
          'v0/token/15/loan_payback_fee_pct/6': '0.01',

          // Unloop mechanism for DUSD
          'v0/token/14/loan_payback_collateral': 'true',

          // On-chain governance
          'v0/params/feature/gov': 'true',

          // Enable consortium
          'v0/params/feature/consortium': 'true',

          // Set a consortium global limit for dBTC
          'v0/consortium/1/mint_limit': '50',
          'v0/consortium/1/mint_limit_daily': '5',

          // Set a consortium member for dBTC
          'v0/consortium/1/members': {
            '01': {
              name: 'Waves HQ',
              ownerAddress: this.consortiumOwnerAddress1,
              backingId: 'backing_address_btc_1_c',
              mintLimitDaily: '5.00000000',
              mintLimit: '50.00000000'
            },
            '02': {
              name: 'Alexandria',
              ownerAddress: this.consortiumOwnerAddress2,
              backingId: 'backing_address_btc_1_br, backing_address_btc_2_br',
              mintLimitDaily: '5.00000000',
              mintLimit: '50.00000000'
            }
          },

          // Consortium global limit for dETH
          'v0/consortium/2/mint_limit': '20',
          'v0/consortium/2/mint_limit_daily': '10',

          // Set a consortium member for dETH
          'v0/consortium/2/members': {
            '01': {
              name: 'Waves HQ',
              ownerAddress: this.consortiumOwnerAddress1,
              backingId: 'backing_address_eth_1_c',
              mintLimitDaily: '5.00000000',
              mintLimit: '10.00000000'
            },
            '02': {
              name: 'Alexandria',
              ownerAddress: this.consortiumOwnerAddress2,
              backingId: 'backing_address_eth_1_br, backing_address_eth_2_br',
              mintLimitDaily: '5.00000000',
              mintLimit: '10.00000000'
            }
          }
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

    await this.client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/evm': 'true',
        'v0/params/feature/transferdomain': 'true',
        'v0/transferdomain/dvm-evm/enabled': 'true',
        'v0/transferdomain/evm-dvm/enabled': 'true',
        'v0/transferdomain/dvm-evm/dat-enabled': 'true',
        'v0/transferdomain/evm-dvm/dat-enabled': 'true',
        'v0/transferdomain/dvm-evm/src-formats': ['p2pkh', 'bech32'],
        'v0/transferdomain/dvm-evm/dest-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/src-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/auth-formats': ['bech32-erc55'],
        'v0/transferdomain/evm-dvm/dest-formats': ['p2pkh', 'bech32']
      }
    })
    await this.generate(1)

    await this.client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/icx': 'true'
      }
    })
    await this.generate(1)
  }
}
