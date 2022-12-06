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

          // Enable consortium
          'v0/params/feature/consortium': 'true',

          // Set a consortium global limit for dBTC
          'v0/consortium/1/mint_limit': '10',
          'v0/consortium/1/mint_limit_daily': '5',

          // Set a consortium member for dBTC
          'v0/consortium/1/members': setMemberInfo([{
            id: '01',
            name: 'Cake',
            ownerAddress: 'bcrt1qc2g87p4pehe0pnfsmph63m00f38gh76tjpuuf9',
            backingId: 'backing_address_btc_1_c',
            dailyMintLimit: '5.00000000',
            mintLimit: '10.00000000'
          }, {
            id: '02',
            name: 'Birthday Research',
            ownerAddress: 'bcrt1qwg4n6520y64ajkl9nhul9jc0dpqhhrunwnmt4t',
            backingId: 'backing_address_btc_1_br, backing_address_btc_2_br',
            dailyMintLimit: '5.00000000',
            mintLimit: '10.00000000'
          }]),

          // Consortium global limit for dETH
          'v0/consortium/2/mint_limit': '20',
          'v0/consortium/2/mint_limit_daily': '10',

          // Set a consortium member for dETH
          'v0/consortium/2/members': setMemberInfo([{
            id: '01',
            name: 'Cake',
            ownerAddress: 'bcrt1qc2g87p4pehe0pnfsmph63m00f38gh76tjpuuf9',
            backingId: 'backing_address_eth_1_c',
            dailyMintLimit: '5.00000000',
            mintLimit: '10.00000000'
          }, {
            id: '02',
            name: 'Birthday Research',
            ownerAddress: 'bcrt1qwg4n6520y64ajkl9nhul9jc0dpqhhrunwnmt4t',
            backingId: 'backing_address_eth_1_br, backing_address_eth_2_br',
            dailyMintLimit: '5.00000000',
            mintLimit: '10.00000000'
          }])
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

function setMemberInfo (memberInfo: Array<{ id: string, name: string, backingId: string, ownerAddress: string, mintLimit: string, dailyMintLimit: string }>): string {
  const infoObjs = memberInfo.map(mi => `
        "${mi.id}":{
          "name":"${mi.name}",
          "ownerAddress":"${mi.ownerAddress}",
          "backingId":"${mi.backingId}",
          "dailyMintLimit":${mi.dailyMintLimit},
          "mintLimit":${mi.mintLimit}
        }`
  )

  return `{${infoObjs.join(',')}}`
}
