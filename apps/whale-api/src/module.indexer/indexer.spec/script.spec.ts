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
    expect(item.hid).toBe(hid)
    expect(item.vout?.txid).toBe(item.txid)
    expect(item.script.hex).toBe(scriptHex)
    expect(Number.parseFloat(item.value)).toBeGreaterThanOrEqual(0)
  }
}

async function expectUnspent (scriptHex: string): Promise<void> {
  const hid = HexEncoder.asSHA256(scriptHex)
  const unspentMapper = app.get(ScriptUnspentMapper)
  const unspent = await unspentMapper.query(hid, 100)

  for (const item of unspent) {
    expect(item.script.hex).toBe(scriptHex)
    expect(Number.parseFloat(item.vout.value)).toBeGreaterThanOrEqual(0)
  }
}

it('should wait for block height 1', async () => {
  await waitForHeight(app, 1)

  const scriptHex = '76a914b36814fd26190b321aa985809293a41273cfe15e88ac'
  const hid = HexEncoder.asSHA256(scriptHex)

  await expectActivities(scriptHex)
  await expectUnspent(scriptHex)

  const aggregationMapper = app.get(ScriptAggregationMapper)
  const aggregation = await aggregationMapper.get(hid, 1)

  expect(aggregation?.hid).toBe(hid)
  expect(aggregation?.block.height).toBe(1)
  expect(aggregation?.script.hex).toBe(scriptHex)

  expect(aggregation?.statistic.txCount).toBe(2)
  expect(aggregation?.statistic.txInCount).toBe(2)
  expect(aggregation?.statistic.txOutCount).toBe(0)

  expect(aggregation?.amount.txOut).toBe('0.00000000')
  expect(aggregation?.amount.txIn).toBe('48.00000000')
  expect(aggregation?.amount.unspent).toBe('48.00000000')
})

it('should wait for block height 2', async () => {
  await waitForHeight(app, 2)

  const scriptHex = '76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac'
  const hid = HexEncoder.asSHA256(scriptHex)

  await expectActivities(scriptHex)
  await expectUnspent(scriptHex)

  const aggregationMapper = app.get(ScriptAggregationMapper)
  const aggregation = await aggregationMapper.get(hid, 2)

  expect(aggregation?.hid).toBe(hid)
  expect(aggregation?.block.height).toBe(2)
  expect(aggregation?.script.hex).toBe(scriptHex)

  expect(aggregation?.statistic.txCount).toBe(1)
  expect(aggregation?.statistic.txInCount).toBe(1)
  expect(aggregation?.statistic.txOutCount).toBe(0)

  expect(aggregation?.amount.txOut).toBe('0.00000000')
  expect(aggregation?.amount.txIn).toBe('38.00000000')
  expect(aggregation?.amount.unspent).toBe('38.00000000')
})

it('should wait for block height 3', async () => {
  await waitForHeight(app, 3)

  const scriptHex = '76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac'
  const hid = HexEncoder.asSHA256(scriptHex)

  await expectActivities(scriptHex)
  await expectUnspent(scriptHex)

  const aggregationMapper = app.get(ScriptAggregationMapper)
  const aggregation = await aggregationMapper.get(hid, 3)

  expect(aggregation?.hid).toBe(hid)
  expect(aggregation?.block.height).toBe(3)
  expect(aggregation?.script.hex).toBe(scriptHex)

  expect(aggregation?.statistic.txCount).toBe(2)
  expect(aggregation?.statistic.txInCount).toBe(2)
  expect(aggregation?.statistic.txOutCount).toBe(0)

  expect(aggregation?.amount.txOut).toBe('0.00000000')
  expect(aggregation?.amount.txIn).toBe('76.00000000')
  expect(aggregation?.amount.unspent).toBe('76.00000000')
})
