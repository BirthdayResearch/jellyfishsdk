import { PlaygroundSetup } from '../setups/setup'
import { Injectable } from '@nestjs/common'
import { SetLoanToken } from '@defichain/jellyfish-api-core/src/category/loan'
import BigNumber from 'bignumber.js'

@Injectable()
export class SetupLoanToken extends PlaygroundSetup<SetLoanToken> {
  list (): SetLoanToken[] {
    return [
      {
        symbol: 'DUSD',
        name: 'Decentralized USD',
        fixedIntervalPriceId: 'DUSD/USD',
        interest: new BigNumber('0')
      },
      {
        symbol: 'TU10',
        name: 'Decentralized TU10',
        fixedIntervalPriceId: 'TU10/USD',
        interest: new BigNumber('1.0')
      },
      {
        symbol: 'TD10',
        name: 'Decentralized TD10',
        fixedIntervalPriceId: 'TD10/USD',
        interest: new BigNumber('1.5')
      },
      {
        symbol: 'TS25',
        name: 'Decentralized TS10',
        fixedIntervalPriceId: 'TS25/USD',
        interest: new BigNumber('2.0')
      },
      {
        symbol: 'TR50',
        name: 'Decentralized TR50',
        fixedIntervalPriceId: 'TR50/USD',
        interest: new BigNumber('3.0')
      }
    ]
  }

  async create (each: SetLoanToken): Promise<void> {
    await this.client.loan.setLoanToken(each)
    await this.generate(1)

    // NOTE(canonbrother): Loan token is strictly not mintable in real world
    // Minting loan token here is for dev purpose
    await this.client.token.mintTokens(`100000000@${each.symbol}`)
  }

  async has (each: SetLoanToken): Promise<boolean> {
    try {
      await this.client.loan.getLoanToken(each.symbol)
      return true
    } catch (e) {
      return false
    }
  }
}
