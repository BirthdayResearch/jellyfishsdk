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

it('should wait for block height 1', async () => {
  await waitForHeight(app, 1)

  const scriptHex = '76a914b36814fd26190b321aa985809293a41273cfe15e88ac'
  const hid = HexEncoder.asSHA256(scriptHex)

  await expectActivities(scriptHex)
  await expectUnspent(scriptHex)

  const aggregationMapper = app.get(ScriptAggregationMapper)
  const aggregation = await aggregationMapper.get(hid, 1)

  expect(aggregation?.hid).toStrictEqual(hid)
  expect(aggregation?.block.height).toStrictEqual(1)
  expect(aggregation?.script.hex).toStrictEqual(scriptHex)

  expect(aggregation?.statistic.txCount).toStrictEqual(2)
  expect(aggregation?.statistic.txInCount).toStrictEqual(2)
  expect(aggregation?.statistic.txOutCount).toStrictEqual(0)

  expect(aggregation?.amount.txOut).toStrictEqual('0.00000000')
  expect(aggregation?.amount.txIn).toStrictEqual('48.00000000')
  expect(aggregation?.amount.unspent).toStrictEqual('48.00000000')
})

it('should wait for block height 2', async () => {
  await waitForHeight(app, 2)

  const scriptHex = '76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac'
  const hid = HexEncoder.asSHA256(scriptHex)

  await expectActivities(scriptHex)
  await expectUnspent(scriptHex)

  const aggregationMapper = app.get(ScriptAggregationMapper)
  const aggregation = await aggregationMapper.get(hid, 2)

  expect(aggregation?.hid).toStrictEqual(hid)
  expect(aggregation?.block.height).toStrictEqual(2)
  expect(aggregation?.script.hex).toStrictEqual(scriptHex)

  expect(aggregation?.statistic.txCount).toStrictEqual(1)
  expect(aggregation?.statistic.txInCount).toStrictEqual(1)
  expect(aggregation?.statistic.txOutCount).toStrictEqual(0)

  expect(aggregation?.amount.txOut).toStrictEqual('0.00000000')
  expect(aggregation?.amount.txIn).toStrictEqual('38.00000000')
  expect(aggregation?.amount.unspent).toStrictEqual('38.00000000')
})

it('should wait for block height 3', async () => {
  await waitForHeight(app, 3)

  const scriptHex = '76a9148857c8c3ce618fe7ae5f8ee11ecc8ea421a1d82988ac'
  const hid = HexEncoder.asSHA256(scriptHex)

  await expectActivities(scriptHex)
  await expectUnspent(scriptHex)

  const aggregationMapper = app.get(ScriptAggregationMapper)
  const aggregation = await aggregationMapper.get(hid, 3)

  expect(aggregation?.hid).toStrictEqual(hid)
  expect(aggregation?.block.height).toStrictEqual(3)
  expect(aggregation?.script.hex).toStrictEqual(scriptHex)

  expect(aggregation?.statistic.txCount).toStrictEqual(2)
  expect(aggregation?.statistic.txInCount).toStrictEqual(2)
  expect(aggregation?.statistic.txOutCount).toStrictEqual(0)

  expect(aggregation?.amount.txOut).toStrictEqual('0.00000000')
  expect(aggregation?.amount.txIn).toStrictEqual('76.00000000')
  expect(aggregation?.amount.unspent).toStrictEqual('76.00000000')
})
