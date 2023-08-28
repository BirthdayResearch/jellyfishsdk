import { Injectable } from '@nestjs/common'
import { BigNumber } from '@defichain/jellyfish-json'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { Interval } from '@nestjs/schedule'

enum PriceDirection {
  UP_ABSOLUTE, // Always going up (absolute value)
  DOWN_ABSOLUTE, // Always going down (absolute value)
  UP_PERCENTAGE, // Always going up (percentage value)
  DOWN_PERCENTAGE, // Always going down (percentage value)
  RANDOM, // Randomly goes up or down (minimum $1)
  STABLE // Fixed value
}

type PriceDirectionFunction = (price: BigNumber, priceChange: BigNumber) => BigNumber

const PriceDirectionFunctions: Record<PriceDirection, PriceDirectionFunction> = {
  [PriceDirection.UP_ABSOLUTE]: (price: BigNumber, priceChange: BigNumber) => {
    return price.plus(priceChange)
  },
  [PriceDirection.DOWN_ABSOLUTE]: (price: BigNumber, priceChange: BigNumber) => {
    return price.minus(priceChange)
  },
  [PriceDirection.UP_PERCENTAGE]: (price: BigNumber, priceChange: BigNumber) => {
    return price.plus(price.times(priceChange))
  },
  [PriceDirection.DOWN_PERCENTAGE]: (price: BigNumber, priceChange: BigNumber) => {
    return price.minus(price.times(priceChange))
  },
  [PriceDirection.RANDOM]: (price: BigNumber, priceChange: BigNumber) => {
    const change = price.times(priceChange)
    if (Math.random() > 0.5 || price.lt(1)) {
      return price.plus(change)
    }
    return price.minus(change)
  },
  [PriceDirection.STABLE]: (price: BigNumber, priceChange: BigNumber) => {
    return price
  }
}

interface SimulatedOracleFeed {
  token: string
  amount: BigNumber
  change: BigNumber
  direction: PriceDirection
}

@Injectable()
export class OracleBot {
  private feeds: SimulatedOracleFeed[] = [
    {
      token: 'CU10',
      amount: new BigNumber(10),
      change: new BigNumber(0.0001),
      direction: PriceDirection.UP_PERCENTAGE
    },
    {
      token: 'TU10',
      amount: new BigNumber(10),
      change: new BigNumber(0.0001),
      direction: PriceDirection.UP_PERCENTAGE
    },
    {
      token: 'CD10',
      amount: new BigNumber(1000000000),
      change: new BigNumber(0.0001),
      direction: PriceDirection.DOWN_PERCENTAGE
    },
    {
      token: 'TD10',
      amount: new BigNumber(1000000000),
      change: new BigNumber(0.0001),
      direction: PriceDirection.DOWN_PERCENTAGE
    },
    {
      token: 'CS25',
      amount: new BigNumber(25),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'TS25',
      amount: new BigNumber(25),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'CR50',
      amount: new BigNumber(1000),
      change: new BigNumber(0.33),
      direction: PriceDirection.RANDOM
    },
    {
      token: 'TR50',
      amount: new BigNumber(1000),
      change: new BigNumber(0.33),
      direction: PriceDirection.RANDOM
    },
    {
      token: 'DFI',
      amount: new BigNumber(100),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'BTC',
      amount: new BigNumber(50),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'ETH',
      amount: new BigNumber(10),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'USDC',
      amount: new BigNumber(1),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'USDT',
      amount: new BigNumber(0.99),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'ZERO',
      amount: new BigNumber(0.99),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'OFF',
      amount: new BigNumber(1),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'EUROC',
      amount: new BigNumber(1),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    },
    {
      token: 'MATIC',
      amount: new BigNumber(1),
      change: new BigNumber(0),
      direction: PriceDirection.STABLE
    }
  ]

  public oracleIds: string[] = []

  constructor (readonly client: ApiClient) {
  }

  @Interval(6000)
  async run (): Promise<void> {
    for (const oracleId of this.oracleIds) {
      await this.publish(oracleId)
    }

    this.feeds = this.feeds.map(value => {
      const func = PriceDirectionFunctions[value.direction]
      return {
        ...value,
        amount: func(value.amount, value.change)
      }
    })
  }

  async publish (oracleId: string): Promise<void> {
    const time = Math.floor(Date.now() / 1000)

    await this.client.oracle.setOracleData(oracleId, time, {
      prices: this.feeds
        .filter(value => {
          return value.amount.gt(new BigNumber(0.00000001)) && value.amount.lt(new BigNumber(1_200_000_000))
        })
        .map(v => ({
          tokenAmount: `${v.amount.toFixed(8)}@${v.token}`,
          currency: 'USD'
        }))
    })
  }
}
