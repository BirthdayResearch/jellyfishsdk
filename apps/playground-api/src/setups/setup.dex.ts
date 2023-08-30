import { PlaygroundSetup } from '../setups/setup'
import { Injectable } from '@nestjs/common'
import { AddPoolLiquiditySource, CreatePoolPairMetadata } from '@defichain/jellyfish-api-core/src/category/poolpair'
import { BalanceTransferPayload } from '@defichain/jellyfish-api-core/src/category/account'
import BigNumber from 'bignumber.js'

interface PoolPairSetup {
  symbol: `${string}-${string}`
  create: CreatePoolPairMetadata
  add?: AddPoolLiquiditySource
  utxoToAccount?: BalanceTransferPayload
}

@Injectable()
export class SetupDex extends PlaygroundSetup<PoolPairSetup> {
  list (): PoolPairSetup[] {
    // MAX_SYMBOL_LENGTH = 8
    return [
      {
        symbol: 'BTC-DFI',
        create: {
          tokenA: 'BTC',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['1000@DFI', '1000@BTC']
        },
        utxoToAccount: {
          [PlaygroundSetup.address]: '1000@0'
        }
      },
      {
        symbol: 'ETH-DFI',
        create: {
          tokenA: 'ETH',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['1000@DFI', '100000@ETH']
        },
        utxoToAccount: {
          [PlaygroundSetup.address]: '1000@0'
        }
      },
      {
        symbol: 'USDT-DFI',
        create: {
          tokenA: 'USDT',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['1000@DFI', '10000000@USDT']
        },
        utxoToAccount: {
          [PlaygroundSetup.address]: '1000@0'
        }
      },
      {
        symbol: 'LTC-DFI',
        create: {
          tokenA: 'LTC',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['100@DFI', '10000@LTC']
        },
        utxoToAccount: {
          [PlaygroundSetup.address]: '100@0'
        }
      },
      {
        symbol: 'USDC-DFI',
        create: {
          tokenA: 'USDC',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['2000@DFI', '20000000@USDC']
        },
        utxoToAccount: {
          [PlaygroundSetup.address]: '2000@0'
        }
      },
      {
        symbol: 'DUSD-DFI',
        create: {
          tokenA: 'DUSD',
          tokenB: 'DFI',
          commission: 0.02,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['10000000@DUSD', '10000000@DFI']
        },
        utxoToAccount: {
          [PlaygroundSetup.address]: '10000000@0'
        }
      },
      {
        symbol: 'TU10-DUSD',
        create: {
          tokenA: 'TU10',
          tokenB: 'DUSD',
          commission: 0.02,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['10000000@DUSD', '10000000@TU10']
        }
      },
      {
        symbol: 'TD10-DUSD',
        create: {
          tokenA: 'TD10',
          tokenB: 'DUSD',
          commission: 0.02,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['10000000@DUSD', '10000000@TD10']
        }
      },
      {
        symbol: 'TS25-DUSD',
        create: {
          tokenA: 'TS25',
          tokenB: 'DUSD',
          commission: 0.02,
          status: true,
          ownerAddress: PlaygroundSetup.address
        }
      },
      {
        symbol: 'TR50-DUSD',
        create: {
          tokenA: 'TR50',
          tokenB: 'DUSD',
          commission: 0.02,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['10000000@DUSD', '10000000@TR50']
        }
      },
      {
        symbol: 'ZERO-DFI',
        create: {
          tokenA: 'ZERO',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: PlaygroundSetup.address
        }
      },
      {
        symbol: 'OFF-DFI',
        create: {
          tokenA: 'OFF',
          tokenB: 'DFI',
          commission: 0,
          status: false,
          ownerAddress: PlaygroundSetup.address
        }
      },
      {
        symbol: 'BTC-DUSD',
        create: {
          tokenA: 'BTC',
          tokenB: 'DUSD',
          commission: 0.01,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['1000@BTC', '10000000@DUSD']
        }
      },
      {
        symbol: 'CU10-DUSD',
        create: {
          tokenA: 'CU10',
          tokenB: 'DUSD',
          commission: 0.01,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['100000@CU10', '1000@DUSD']
        }
      },
      {
        symbol: 'BTC-USDT',
        create: {
          tokenA: 'BTC',
          tokenB: 'USDT',
          commission: 0.01,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['1000@BTC', '10000000@USDT']
        }
      },
      {
        symbol: 'EUROC-DFI',
        create: {
          tokenA: 'EUROC',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['2000@DFI', '20000000@EUROC']
        },
        utxoToAccount: {
          [PlaygroundSetup.address]: '2000@0'
        }
      },
      {
        symbol: 'MATIC-DFI',
        create: {
          tokenA: 'MATIC',
          tokenB: 'DFI',
          commission: 0,
          status: true,
          ownerAddress: PlaygroundSetup.address
        },
        add: {
          '*': ['3000@DFI', '30000000@MATIC']
        },
        utxoToAccount: {
          [PlaygroundSetup.address]: '3000@0'
        }
      }
    ]
  }

  async create (each: PoolPairSetup): Promise<void> {
    if (each.utxoToAccount !== undefined) {
      const amount = Object.values(each.utxoToAccount)[0].replace('@0', '')
      await this.waitForBalance(Number(amount) + 1)
      await this.client.account.utxosToAccount(each.utxoToAccount)
      await this.generate(1)
    }

    await this.client.poolpair.createPoolPair(each.create)
    await this.generate(1)

    if (each.add !== undefined) {
      await this.client.poolpair.addPoolLiquidity(each.add, PlaygroundSetup.address)
      await this.generate(1)
    }
  }

  async has (each: PoolPairSetup): Promise<boolean> {
    try {
      await this.client.poolpair.getPoolPair(each.symbol)
      return true
    } catch (e) {
      return false
    }
  }

  async after (list: PoolPairSetup[]): Promise<void> {
    const poolPairs = await this.client.poolpair.listPoolPairs()
    const poolPairIds = Object.keys(poolPairs)

    // apply `toFixed(8)` due to 1 / 17 = 0.05882353 which is valid amount on setgov
    const splits = Number(new BigNumber(1 / poolPairIds.length).toFixed(8))

    const lpSplits: any = {}
    for (const k in poolPairs) {
      lpSplits[parseInt(k)] = splits
    }
    // to fix: LP_SPLITS: total = 0.9996 vs expected 100000000', code: -32600, method: setgov
    // 0.05882353 * 17 !== 100000000
    const lstKey = Object.keys(lpSplits)[0]
    lpSplits[lstKey] = Number(new BigNumber(lpSplits[lstKey]).minus(0.00000001).toFixed(8))
    await this.client.masternode.setGov({ LP_SPLITS: lpSplits })
    await this.generate(1)
  }
}
