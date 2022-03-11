import { Injectable } from '@nestjs/common'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { Interval } from '@nestjs/schedule'
import { PlaygroundSetup } from '../setups/setup'

@Injectable()
export class VaultBot {
  private vaultId?: string

  constructor (protected readonly client: ApiClient) {
  }

  @Interval(6000)
  async run (): Promise<void> {
    if (this.vaultId === undefined) {
      this.vaultId = await this.client.vault.createVault({
        loanSchemeId: 'MIN150',
        ownerAddress: PlaygroundSetup.address
      })

      await this.client.account.utxosToAccount({
        [PlaygroundSetup.address]: '100000@0'
      })
      return
    }

    await this.client.vault.depositToVault({
      amount: '100@DFI',
      from: PlaygroundSetup.address,
      vaultId: this.vaultId
    })

    await this.client.loan.takeLoan({
      amounts: [
        '20@DUSD',
        '0.01@TU10',
        '0.00000010@TD10',
        '0.1@TS25',
        '0.01@TR50'
      ],
      to: PlaygroundSetup.address,
      vaultId: this.vaultId
    })

    await this.client.poolpair.addPoolLiquidity({
      '*': ['1@DFI', '10@DUSD']
    }, PlaygroundSetup.address)
    await this.client.poolpair.addPoolLiquidity({
      '*': ['2@DUSD', '0.01@TU10']
    }, PlaygroundSetup.address)
    await this.client.poolpair.addPoolLiquidity({
      '*': ['2@DUSD', '0.00000010@TD10']
    }, PlaygroundSetup.address)
    await this.client.poolpair.addPoolLiquidity({
      '*': ['2@DUSD', '0.1@TS25']
    }, PlaygroundSetup.address)
    await this.client.poolpair.addPoolLiquidity({
      '*': ['2@DUSD', '0.01@TR50']
    }, PlaygroundSetup.address)
  }
}
