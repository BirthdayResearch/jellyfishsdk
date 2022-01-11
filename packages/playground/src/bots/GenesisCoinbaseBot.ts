import { AbstractBot } from '../AbstractBot'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { CreateTokenMetadata } from '@defichain/jellyfish-api-core/src/category/token'
import { CreatePoolPairMetadata, AddPoolLiquiditySource } from '@defichain/jellyfish-api-core/src/category/poolpair'
import { BalanceTransferPayload } from '@defichain/jellyfish-api-core/src/category/account'
import { AppointOracleOptions, OraclePriceFeed } from '@defichain/jellyfish-api-core/src/category/oracle'

interface TokenSetup {
  create: CreateTokenMetadata
  amount: number
}

interface PoolPairSetup {
  symbol: `${string}-${string}`
  create: CreatePoolPairMetadata
  add?: AddPoolLiquiditySource
  utxoToAccount?: BalanceTransferPayload
}

interface OracleSetup {
  address: string
  priceFeeds: OraclePriceFeed[]
  options: AppointOracleOptions
}

const FEEDS: OraclePriceFeed[] = [
  {
    token: 'TSLA',
    currency: 'USD'
  },
  {
    token: 'AAPL',
    currency: 'USD'
  },
  {
    token: 'FB',
    currency: 'USD'
  },
  {
    token: 'CU10',
    currency: 'USD'
  },
  {
    token: 'TU10',
    currency: 'USD'
  },
  {
    token: 'CD10',
    currency: 'USD'
  },
  {
    token: 'TD10',
    currency: 'USD'
  },
  {
    token: 'CS25',
    currency: 'USD'
  },
  {
    token: 'TS25',
    currency: 'USD'
  },
  {
    token: 'CR50',
    currency: 'USD'
  },
  {
    token: 'TR50',
    currency: 'USD'
  },
  {
    token: 'DFI',
    currency: 'USD'
  },
  {
    token: 'BTC',
    currency: 'USD'
  },
  {
    token: 'ETH',
    currency: 'USD'
  },
  {
    token: 'USDC',
    currency: 'USD'
  },
  {
    token: 'USDT',
    currency: 'USD'
  }
]

export class GenesisCoinbaseBot extends AbstractBot {
  static MN_KEY = RegTestFoundationKeys[0]
  OWNER_ADDR = GenesisCoinbaseBot.MN_KEY.owner.address
  OPERATOR_ADDR = GenesisCoinbaseBot.MN_KEY.operator.address

  private readonly oracleIds: string[] = []

  /**
   * @param {number} count of blocks to generate
   */
  protected async generate (count: number): Promise<void> {
    let current = await this.apiClient.blockchain.getBlockCount()
    const target = current + count
    while (current < target) {
      this.logger.info('generate', `current block: ${current}, generate +${count} block`)
      await this.generateToAddress()
      current = await this.apiClient.blockchain.getBlockCount()
    }
  }

  /**
   * @param {number} balance to wait for wallet to reach
   */
  protected async waitForBalance (balance: number): Promise<void> {
    let current = await this.apiClient.wallet.getBalance()
    while (current.lt(balance)) {
      this.logger.info('waitForBalance', `current balance: ${current.toFixed(8)}, generate to balance: ${balance}`)
      await this.apiClient.call('generatetoaddress', [1, this.OPERATOR_ADDR, 1], 'number')
      current = await this.apiClient.wallet.getBalance()
    }
  }

  private async generateToAddress (): Promise<void> {
    await this.apiClient.call('generatetoaddress', [1, this.OPERATOR_ADDR, 1], 'number')
    await this.wait(200)
  }

  private async wait (millis: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(_ => resolve(0), millis)
    })
  }

  listTokens (): TokenSetup[] {
    return [
      {
        create: {
          symbol: 'BTC',
          name: 'Playground BTC',
          isDAT: true,
          mintable: true,
          tradeable: true,
          collateralAddress: this.OPERATOR_ADDR
        },
        amount: 10000
      },
      {
        create: {
          symbol: 'ETH',
          name: 'Playground ETH',
          isDAT: true,
          mintable: true,
          tradeable: true,
          collateralAddress: this.OPERATOR_ADDR
        },
        amount: 100000000
      },
      {
        create: {
          symbol: 'USDT',
          name: 'Playground USDT',
          isDAT: true,
          mintable: true,
          tradeable: true,
          collateralAddress: this.OPERATOR_ADDR
        },
        amount: 1000000000
      },
      {
        create: {
          symbol: 'LTC',
          name: 'Playground LTC',
          isDAT: true,
          mintable: true,
          tradeable: true,
          collateralAddress: this.OPERATOR_ADDR
        },
        amount: 100000
      },
      {
        create: {
          symbol: 'USDC',
          name: 'Playground USDC',
          isDAT: true,
          mintable: true,
          tradeable: true,
          collateralAddress: this.OPERATOR_ADDR
        },
        amount: 200000000
      },
      {
        create: {
          symbol: 'CU10',
          name: 'Playground CU10',
          isDAT: true,
          mintable: true,
          tradeable: true,
          collateralAddress: this.OPERATOR_ADDR
        },
        amount: 100000000
      },
      {
        create: {
          symbol: 'CD10',
          name: 'Playground CD10',
          isDAT: true,
          mintable: true,
          tradeable: true,
          collateralAddress: this.OPERATOR_ADDR
        },
        amount: 100000000
      },
      {
        create: {
          symbol: 'CS25',
          name: 'Playground CS25',
          isDAT: true,
          mintable: true,
          tradeable: true,
          collateralAddress: this.OPERATOR_ADDR
        },
        amount: 100000000
      },
      {
        create: {
          symbol: 'CR50',
          name: 'Playground CR50',
          isDAT: true,
          mintable: true,
          tradeable: true,
          collateralAddress: this.OPERATOR_ADDR
        },
        amount: 100000000
      }
    ]
  }

  listPoolPairs (): PoolPairSetup[] {
    // MAX_SYMBOL_LENGTH = 8
    return [
      {
        symbol: 'BTC-DFI',
        create: {
          tokenA: 'BTC',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        },
        add: {
          '*': ['1000@DFI', '1000@BTC']
        },
        utxoToAccount: {
          [this.OPERATOR_ADDR]: '1000@0'
        }
      },
      {
        symbol: 'ETH-DFI',
        create: {
          tokenA: 'ETH',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        },
        add: {
          '*': ['1000@DFI', '100000@ETH']
        },
        utxoToAccount: {
          [this.OPERATOR_ADDR]: '1000@0'
        }
      },
      {
        symbol: 'USDT-DFI',
        create: {
          tokenA: 'USDT',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        },
        add: {
          '*': ['1000@DFI', '10000000@USDT']
        },
        utxoToAccount: {
          [this.OPERATOR_ADDR]: '1000@0'
        }
      },
      {
        symbol: 'LTC-DFI',
        create: {
          tokenA: 'LTC',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        },
        add: {
          '*': ['100@DFI', '10000@LTC']
        },
        utxoToAccount: {
          [this.OPERATOR_ADDR]: '100@0'
        }
      },
      {
        symbol: 'USDC-DFI',
        create: {
          tokenA: 'USDC',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        },
        add: {
          '*': ['2000@DFI', '20000000@USDC']
        },
        utxoToAccount: {
          [this.OPERATOR_ADDR]: '2000@0'
        }
      },
      {
        symbol: 'DUSD-DFI',
        create: {
          tokenA: 'DUSD',
          tokenB: 'DFI',
          commission: 0.02,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        }
      },
      {
        symbol: 'TU10-DUSD',
        create: {
          tokenA: 'TU10',
          tokenB: 'DUSD',
          commission: 0.02,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        }
      },
      {
        symbol: 'TD10-DUSD',
        create: {
          tokenA: 'TD10',
          tokenB: 'DUSD',
          commission: 0.02,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        }
      },
      {
        symbol: 'TS25-DUSD',
        create: {
          tokenA: 'TS25',
          tokenB: 'DUSD',
          commission: 0.02,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        }
      },
      {
        symbol: 'TR50-DUSD',
        create: {
          tokenA: 'TR50',
          tokenB: 'DUSD',
          commission: 0.02,
          status: true,
          ownerAddress: this.OPERATOR_ADDR
        }
      }
    ]
  }

  listOracles (): OracleSetup[] {
    return [
      {
        address: this.OPERATOR_ADDR,
        priceFeeds: FEEDS,
        options: {
          weightage: 1
        }
      },
      {
        address: this.OPERATOR_ADDR,
        priceFeeds: FEEDS,
        options: {
          weightage: 1
        }
      },
      {
        address: this.OPERATOR_ADDR,
        priceFeeds: FEEDS,
        options: {
          weightage: 1
        }
      }
    ]
  }

  async createToken (each: TokenSetup): Promise<void> {
    await this.apiClient.token.createToken(each.create)
    await this.generate(1)
    this.logger.info('createToken', `symbol: ${each.create.symbol}`)
  }

  async createPoolPair (each: PoolPairSetup): Promise<void> {
    if (each.utxoToAccount !== undefined) {
      const amount = Object.values(each.utxoToAccount)[0].replace('@0', '')
      await this.waitForBalance(Number(amount) + 1)
      await this.apiClient.account.utxosToAccount(each.utxoToAccount)
      await this.generate(1)
    }

    await this.apiClient.poolpair.createPoolPair(each.create)
    await this.generate(1)

    if (each.add !== undefined) {
      await this.apiClient.poolpair.addPoolLiquidity(each.add, this.OPERATOR_ADDR)
      await this.generate(1)
    }
    await this.apiClient.call('generatetoaddress', [1, this.OPERATOR_ADDR, 1], 'number')
    this.logger.info('createPoolPair', `symbol: ${each.symbol}`)
  }

  async createOracle (each: OracleSetup): Promise<void> {
    await this.waitForBalance(101)
    const oracleId = await this.apiClient.oracle.appointOracle(each.address, each.priceFeeds, each.options)
    this.oracleIds.push(oracleId)
  }

  async bootstrap (): Promise<void> {
    const tokens = this.listTokens()
    for (const token of tokens) {
      await this.createToken(token)
    }

    const poolPairs = this.listPoolPairs()
    for (const poolPair of poolPairs) {
      await this.createPoolPair(poolPair)
    }

    const oracles = this.listOracles()
    for (const oracle of oracles) {
      await this.createOracle(oracle)
    }
  }

  async cycle (n: number): Promise<void> {
  }
}
