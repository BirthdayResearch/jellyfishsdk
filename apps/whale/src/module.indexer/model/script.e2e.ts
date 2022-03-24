import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ScriptUnspentMapper } from '../../module.model/script.unspent'
import { HexEncoder } from '../../module.model/_hex.encoder'
import { ScriptActivityMapper } from '../../module.model/script.activity'
import { ScriptAggregationMapper } from '../../module.model/script.aggregation'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../e2e.module'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.generate(21)

  app = await createTestingApp(container)
})

afterAll(async () => {
  await stopTestingApp(container, app)
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
    await waitForIndexedHeight(app, 0)
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
    await waitForIndexedHeight(app, 1)
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
    await waitForIndexedHeight(app, 2)
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
