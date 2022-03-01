import { PlaygroundSetup } from '../setups/setup'
import { Injectable } from '@nestjs/common'

@Injectable()
export class SetupUtxo extends PlaygroundSetup<{}> {
  async create (each: {}): Promise<void> {
    const count = 50

    const amounts: Record<string, number> = {}
    for (let i = 0; i < count; i++) {
      amounts[await this.client.wallet.getNewAddress()] = 10000
    }

    await this.waitForBalance(10000 * count)
    await this.client.wallet.sendMany(amounts)
  }

  async has (each: {}): Promise<boolean> {
    return false
  }

  list (): Array<{}> {
    return [{}]
  }
}
