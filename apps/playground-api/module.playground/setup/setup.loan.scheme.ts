import { PlaygroundSetup } from '../../module.playground/setup/setup'
import { Injectable } from '@nestjs/common'
import { CreateLoanScheme } from '@defichain/jellyfish-api-core/src/category/loan'
import BigNumber from 'bignumber.js'

@Injectable()
export class SetupLoanScheme extends PlaygroundSetup<CreateLoanScheme> {
  list (): CreateLoanScheme[] {
    return [
      {
        id: 'MIN150',
        interestRate: new BigNumber('5'),
        minColRatio: 150
      },
      {
        id: 'MIN175',
        interestRate: new BigNumber('3'),
        minColRatio: 175
      },
      {
        id: 'MIN200',
        interestRate: new BigNumber('2'),
        minColRatio: 200
      },
      {
        id: 'MIN350',
        interestRate: new BigNumber('1.5'),
        minColRatio: 350
      },
      {
        id: 'MIN500',
        interestRate: new BigNumber('1'),
        minColRatio: 500
      },
      {
        id: 'MIN10000',
        interestRate: new BigNumber('0.5'),
        minColRatio: 1000
      }
    ]
  }

  async create (each: CreateLoanScheme): Promise<void> {
    await this.client.loan.createLoanScheme(each)
  }

  async has (each: CreateLoanScheme): Promise<boolean> {
    try {
      await this.client.loan.getLoanScheme(each.id)
      return true
    } catch (e) {
      return false
    }
  }
}
