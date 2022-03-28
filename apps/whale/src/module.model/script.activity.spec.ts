import { Database } from '../module.database/database'
import { Test } from '@nestjs/testing'
import { MemoryDatabaseModule } from '../module.database/provider.memory/module'
import { LevelDatabase } from '../module.database/provider.level/level.database'
import { ScriptActivityMapper, ScriptActivityType } from '../module.model/script.activity'
import { HexEncoder } from '../module.model/_hex.encoder'

let database: Database
let mapper: ScriptActivityMapper

beforeAll(async () => {
  const app = await Test.createTestingModule({
    imports: [MemoryDatabaseModule],
    providers: [ScriptActivityMapper]
  }).compile()

  database = app.get<Database>(Database)
  mapper = app.get<ScriptActivityMapper>(ScriptActivityMapper)
})

beforeEach(async () => {
  async function put (hex: string, height: number, type: ScriptActivityType, txid: string, n: number): Promise<void> {
    await mapper.put({
      id: HexEncoder.encodeHeight(height) + ScriptActivityMapper.typeAsHex(type) + txid + HexEncoder.encodeVoutIndex(n),
      hid: HexEncoder.asSHA256(hex),
      block: {
        hash: '',
        height: height,
        time: 0,
        medianTime: 0
      },
      script: {
        hex: hex,
        type: ''
      },
      txid: txid,
      type: type,
      typeHex: ScriptActivityMapper.typeAsHex(type),
      value: '1.00'
    })
  }

  const hex = '1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a'

  function randomTxid (): string {
    return (Math.random() * Number.MAX_SAFE_INTEGER).toString(16).padStart(64, '0')
  }

  await put(hex, 0, 'vin', randomTxid(), 0)
  await put(hex, 0, 'vout', randomTxid(), 1)
  await put(hex, 1, 'vin', randomTxid(), 0)
  await put(hex, 1, 'vout', randomTxid(), 1)
})

afterEach(async () => {
  await (database as LevelDatabase).clear()
})

it('should query', async () => {
  const hex = '1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a'
  const hid = HexEncoder.asSHA256(hex)
  const list = await mapper.query(hid, 10)

  expect(list.length).toStrictEqual(4)

  expect(list[0].block.height).toStrictEqual(1)
  expect(list[0].typeHex).toStrictEqual('01')

  expect(list[1].block.height).toStrictEqual(1)
  expect(list[1].typeHex).toStrictEqual('00')

  expect(list[2].block.height).toStrictEqual(0)
  expect(list[2].typeHex).toStrictEqual('01')

  expect(list[3].block.height).toStrictEqual(0)
  expect(list[3].typeHex).toStrictEqual('00')
})

it('should delete', async () => {
  const hex = '1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a'
  const hid = HexEncoder.asSHA256(hex)
  const list = await mapper.query(hid, 10)

  await mapper.delete(list[0].id)
  const deleted = await mapper.query(hid, 10)
  expect(deleted.length).toStrictEqual(3)
})
