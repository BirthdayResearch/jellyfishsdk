import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp } from '../../../src/e2e.module'
import { addressToHid } from '../../../src/module.api/address.controller'
import { ScriptAggregationMapper } from '../../../src/module.model/script.aggregation'
import waitForExpect from 'wait-for-expect'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class StubService {
  app?: NestFastifyApplication

  constructor (readonly container: MasterNodeRegTestContainer) {
  }

  async start (): Promise<void> {
    this.app = await createTestingApp(this.container)
  }

  async stop (): Promise<void> {
    this.app?.close()
  }

  async waitForAddressTxCount (address: string, txCount: number, timeout: number = 15000): Promise<void> {
    const hid = addressToHid('regtest', address)
    const aggregationMapper = this.app?.get(ScriptAggregationMapper)
    if (aggregationMapper === undefined) {
      throw new Error('StubService not initialized yet')
    }
    await waitForExpect(async () => {
      const agg = await aggregationMapper.getLatest(hid)
      expect(agg?.statistic.txCount).toStrictEqual(txCount)
    }, timeout)
  }
}
