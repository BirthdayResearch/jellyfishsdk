import { PlaygroundSetup } from '../setups/setup'
import { Injectable } from '@nestjs/common'
import { AppointOracleOptions, OraclePriceFeed } from '@defichain/jellyfish-api-core/src/category/oracle'
import { OracleBot } from '../bots/OracleBot'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { ApiClient } from '@defichain/jellyfish-api-core'

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
  },
  {
    token: 'ZERO',
    currency: 'USD'
  },
  {
    token: 'OFF',
    currency: 'USD'
  },
  {
    token: 'EUROC',
    currency: 'USD'
  },
  {
    token: 'MATIC',
    currency: 'USD'
  }
]

@Injectable()
export class SetupOracle extends PlaygroundSetup<OracleSetup> {
  oracleOwnerAddress: string = RegTestFoundationKeys[0].owner.address
  private readonly oracleIds: string[] = []

  constructor (client: ApiClient, readonly oracleBot: OracleBot) {
    super(client)
  }

  list (): OracleSetup[] {
    return [
      {
        address: this.oracleOwnerAddress,
        priceFeeds: FEEDS,
        options: {
          weightage: 1
        }
      },
      {
        address: this.oracleOwnerAddress,
        priceFeeds: FEEDS,
        options: {
          weightage: 1
        }
      },
      {
        address: this.oracleOwnerAddress,
        priceFeeds: FEEDS,
        options: {
          weightage: 1
        }
      }
    ]
  }

  async create (each: OracleSetup): Promise<void> {
    await this.waitForBalance(101)
    const oracleId = await this.client.oracle.appointOracle(each.address, each.priceFeeds, each.options)
    this.oracleIds.push(oracleId)
  }

  protected async after (list: OracleSetup[]): Promise<void> {
    await this.generate(1)
    this.oracleBot.oracleIds = this.oracleIds
    await this.oracleBot.run()
    await this.generate(1)
  }

  async has (each: OracleSetup): Promise<boolean> {
    try {
      return (await this.client.oracle.listOracles()).length >= this.list().length
    } catch (e) {
      return false
    }
  }
}
