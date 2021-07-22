import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingModule } from '@nestjs/testing'
import { createIndexerTestModule, stopIndexer, waitForHeight } from '@src/module.indexer/indexer.spec/_testing.module'
import { ScriptUnspentMapper } from '@src/module.model/script.unspent'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { ScriptActivityMapper } from '@src/module.model/script.activity'
import { ScriptAggregationMapper } from '@src/module.model/script.aggregation'

const container = new MasterNodeRegTestContainer()
let app: TestingModule

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(20)

  app = await createIndexerTestModule(container)
  await app.init()
})

afterAll(async () => {
  try {
    await stopIndexer(app)
  } finally {
    await container.stop()
  }
})

/* eslint-disable @typescript-eslint/no-non-null-assertion */

async function expectActivities (scriptHex: string): Promise<void> {
  const hid = HexEncoder.asSHA256(scriptHex)
  const activityMapper = app.get(ScriptActivityMapper)
  const activities = await activityMapper.query(hid, 100)

  for (const item of activities) {
    expect(item.hid).toStrictEqual(hid)
    expect(item.vout?.txid).toStrictEqual(item.txid)
    expect(item.script.hex).toStrictEqual(scriptHex)
    expect(Number.parseFloat(item.value)).toBeGreaterThanOrEqual(0)
  }
}

async function expectUnspent (scriptHex: string): Promise<void> {
  const hid = HexEncoder.asSHA256(scriptHex)
  const unspentMapper = app.get(ScriptUnspentMapper)
  const unspent = await unspentMapper.query(hid, 100)

  for (const item of unspent) {
    expect(item.script.hex).toStrictEqual(scriptHex)
    expect(Number.parseFloat(item.vout.value)).toBeGreaterThanOrEqual(0)
  }
}

describe('76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac', () => {
  const scriptHex = '76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac'
  const hid = HexEncoder.asSHA256(scriptHex)

  it('should wait for block height 0', async () => {
    await waitForHeight(app, 0)
    await expectActivities(scriptHex)
    await expectUnspent(scriptHex)

    const aggregationMapper = app.get(ScriptAggregationMapper)
    const aggregation = await aggregationMapper.get(hid, 0)

    expect(aggregation?.hid).toStrictEqual(hid)
    expect(aggregation?.script.hex).toStrictEqual(scriptHex)
    expect(aggregation?.block.height).toStrictEqual(0)

    expect(aggregation?.statistic.txCount).toStrictEqual(1)
    expect(aggregation?.statistic.txInCount).toStrictEqual(1)
    expect(aggregation?.statistic.txOutCount).toStrictEqual(0)

    expect(aggregation?.amount.txOut).toStrictEqual('0.00000000')
    expect(aggregation?.amount.txIn).toStrictEqual('100000000.00000000')
    expect(aggregation?.amount.unspent).toStrictEqual('100000000.00000000')
  })

  it('should wait for block height 1', async () => {
    await waitForHeight(app, 1)
    await expectActivities(scriptHex)
    await expectUnspent(scriptHex)

    const aggregationMapper = app.get(ScriptAggregationMapper)
    const aggregation = await aggregationMapper.get(hid, 1)

    expect(aggregation?.hid).toStrictEqual(hid)
    expect(aggregation?.script.hex).toStrictEqual(scriptHex)
    expect(aggregation?.block.height).toStrictEqual(1)

    expect(aggregation?.statistic.txCount).toStrictEqual(2)
    expect(aggregation?.statistic.txInCount).toStrictEqual(2)
    expect(aggregation?.statistic.txOutCount).toStrictEqual(0)

    expect(aggregation?.amount.txOut).toStrictEqual('0.00000000')
    expect(aggregation?.amount.txIn).toStrictEqual('100000076.00000000')
    expect(aggregation?.amount.unspent).toStrictEqual('100000076.00000000')
  })

  it('should wait for block height 2', async () => {
    await waitForHeight(app, 2)
    await expectActivities(scriptHex)
    await expectUnspent(scriptHex)

    const aggregationMapper = app.get(ScriptAggregationMapper)
    const aggregation = await aggregationMapper.get(hid, 2)

    expect(aggregation?.hid).toStrictEqual(hid)
    expect(aggregation?.script.hex).toStrictEqual(scriptHex)
    expect(aggregation?.block.height).toStrictEqual(2)

    expect(aggregation?.statistic.txCount).toStrictEqual(3)
    expect(aggregation?.statistic.txInCount).toStrictEqual(3)
    expect(aggregation?.statistic.txOutCount).toStrictEqual(0)

    expect(aggregation?.amount.txOut).toStrictEqual('0.00000000')
    expect(aggregation?.amount.txIn).toStrictEqual('100000152.00000000')
    expect(aggregation?.amount.unspent).toStrictEqual('100000152.00000000')
  })
})
