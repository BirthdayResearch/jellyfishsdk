import BigNumber from 'bignumber.js'
import { GenesisCoinbaseBot } from './GenesisCoinbaseBot'
import { TokenCreate } from '@defichain/jellyfish-transaction'

interface TokenSetup {
  create: TokenCreate
  fee: number
}

export class TokenBot extends GenesisCoinbaseBot<TokenSetup> {
  list (): TokenSetup[] {
    return [
      {
        create: {
          symbol: 'BTC',
          name: 'Playground BTC',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        // 0.00000785 is added for calculateFeeP2WPKH deduction, 11(total) - 1(creationFee) = 10(collateralAmount)
        fee: 11 + 0.00000785
      },
      {
        create: {
          symbol: 'ETH',
          name: 'Playground ETH',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000785
      },
      {
        create: {
          symbol: 'USDT',
          name: 'Playground USDT',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'LTC',
          name: 'Playground LTC',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000785
      },
      {
        create: {
          symbol: 'USDC',
          name: 'Playground USDC',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'CU10',
          name: 'Playground CU10',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'CD10',
          name: 'Playground CD10',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'CS25',
          name: 'Playground CS25',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'CR50',
          name: 'Playground CR50',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      }
    ]
  }

  async create (each: TokenSetup): Promise<void> {
    await this.fund(each.fee)
    const tx = await this.builder.token.createToken(each.create, await this.providers.elliptic.script())
    await this.sendTransaction(tx)
    await this.generate()
  }

  async has (each: TokenSetup): Promise<boolean> {
    try {
      await this.apiClient.token.getToken(each.create.symbol)
      return true
    } catch (e) {
      return false
    }
  }
}
