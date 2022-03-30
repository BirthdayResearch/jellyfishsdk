import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common'
import { SetupToken } from '../setups/setup.token'
import { SetupDex } from '../setups/setup.dex'
import { SetupOracle } from '../setups/setup.oracle'
import { PlaygroundProbeIndicator } from '../PlaygroundIndicator'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { PlaygroundBlock } from '../PlaygroundBlock'
import { PlaygroundSetup } from '../setups/setup'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { SetupMasternode } from '../setups/setup.masternode'
import { SetupUtxo } from '../setups/setup.utxo'
import { OracleBot } from '../bots/OracleBot'
import { SetupLoanScheme } from '../setups/setup.loan.scheme'
import { SetupLoanToken } from '../setups/setup.loan.token'
import { SetupLoanCollateral } from '../setups/setup.loan.collateral'
import { VaultBot } from '../bots/VaultBot'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
  providers: [
    SetupUtxo,
    SetupToken,
    SetupDex,
    SetupOracle,
    SetupMasternode,
    SetupLoanScheme,
    SetupLoanToken,
    SetupLoanCollateral,
    OracleBot,
    VaultBot,
    PlaygroundBlock,
    PlaygroundProbeIndicator
  ],
  exports: [
    PlaygroundProbeIndicator
  ]
})
export class PlaygroundModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlaygroundModule.name)

  private readonly setups: Array<PlaygroundSetup<any>>

  constructor (
    private readonly client: ApiClient,
    private readonly indicator: PlaygroundProbeIndicator,
    utxo: SetupUtxo,
    token: SetupToken,
    dex: SetupDex,
    oracle: SetupOracle,
    masternode: SetupMasternode,
    loanScheme: SetupLoanScheme,
    loanToken: SetupLoanToken,
    loanCollateral: SetupLoanCollateral
  ) {
    this.setups = [
      utxo,
      token,
      oracle,
      masternode,
      loanScheme,
      loanToken,
      loanCollateral,
      dex
    ]
  }

  async onApplicationBootstrap (): Promise<void> {
    await this.waitForDeFiD()
    await this.importPrivKey()

    for (const setup of this.setups) {
      await setup.setup()
    }

    this.logger.log('setup completed')
    this.indicator.ready = true
  }

  async importPrivKey (): Promise<void> {
    this.logger.log('importing private keys')

    if (await this.client.blockchain.getBlockCount() > 0) {
      return
    }

    for (const genesisKey of RegTestFoundationKeys) {
      await this.client.wallet.importPrivKey(genesisKey.owner.privKey, undefined, true)
      await this.client.wallet.importPrivKey(genesisKey.operator.privKey, undefined, true)
    }
  }

  async waitForDeFiD (timeout = 45000): Promise<void> {
    const expiredAt = Date.now() + timeout

    while (expiredAt > Date.now()) {
      try {
        const info = await this.client.blockchain.getBlockchainInfo()
        if (info.blocks === 0) {
          return
        }
        if (!info.initialblockdownload) {
          return
        }
      } catch (err) {
      }
      await new Promise((resolve) => {
        setTimeout(_ => resolve(0), 1000)
      })
    }

    throw new Error(`DeFiD not ready within given timeout of ${timeout}ms.`)
  }
}
