import { TestingModule } from '@nestjs/testing'
import { DynamoDbContainer } from '../../testing/containers/DynamoDbContainer'
import { DexSwap, DexSwapMapper, yyyyMmDd } from '../../src/models/dftx/DexSwap'
import { BigNumber } from '@defichain/jellyfish-json'
import { modelModuleTesting } from './ModelModuleTesting'
import { SortOrder } from '../../src/indexer/database/_abstract'

let testingModule: TestingModule
let dexSwapMapper: DexSwapMapper
const ddbContainer = new DynamoDbContainer()

beforeAll(async () => {
  await ddbContainer.start()

  testingModule = await modelModuleTesting(
    await ddbContainer.getHostPort()
  ).compile()

  await testingModule.init()
  dexSwapMapper = testingModule.get(DexSwapMapper)
})

afterAll(async () => {
  await ddbContainer.stop()
  await testingModule.close()
})

it('should create and read a dex swap', async () => {
  const dexSwap = makeDexSwap('aaa123', Date.parse('14 Feb 2022 00:00:00 UTC'))
  await dexSwapMapper.put(dexSwap)
  expect({ ...await dexSwapMapper.get('aaa123') }).toStrictEqual(dexSwap)
})

it('should delete', async () => {
  const dexSwap = makeDexSwap('aaa124', Date.parse('14 Feb 2022 00:00:00 UTC'))
  await dexSwapMapper.put(dexSwap)

  await dexSwapMapper.delete('aaa124')
  expect(await dexSwapMapper.get('aaa124')).toBeUndefined()
})

describe('list - ordering', () => {
  beforeAll(async () => {
    await dexSwapMapper.put(makeDexSwap('aaa127', Date.parse('15 Feb 2022 00:00:01 UTC')))
    // Should be able to handle overlapping time
    await dexSwapMapper.put(makeDexSwap('aaa126', Date.parse('15 Feb 2022 00:00:00 UTC')))
    await dexSwapMapper.put(makeDexSwap('aaa125', Date.parse('15 Feb 2022 00:00:00 UTC')))
    await dexSwapMapper.put(makeDexSwap('aaa128', Date.parse('15 Feb 2022 00:00:02 UTC')))
  })

  it('should list in ascending order (by default)', async () => {
    expect(await dexSwapMapper.list(new Date(Date.parse('15 Feb 2022 00:00:00 UTC'))))
      .toEqual({
        data: expect.arrayContaining([
          makeDexSwap('aaa125', Date.parse('15 Feb 2022 00:00:00 UTC')),
          makeDexSwap('aaa126', Date.parse('15 Feb 2022 00:00:00 UTC')),
          makeDexSwap('aaa127', Date.parse('15 Feb 2022 00:00:01 UTC')),
          makeDexSwap('aaa128', Date.parse('15 Feb 2022 00:00:02 UTC'))
        ]),
        lastKey: undefined
      })
  })

  it('should list in descending order', async () => {
    expect(await dexSwapMapper.list(new Date(Date.parse('15 Feb 2022 00:00:00 UTC')), SortOrder.DESC))
      .toEqual({
        data: expect.arrayContaining([
          makeDexSwap('aaa128', Date.parse('15 Feb 2022 00:00:02 UTC')),
          makeDexSwap('aaa127', Date.parse('15 Feb 2022 00:00:01 UTC')),
          makeDexSwap('aaa126', Date.parse('15 Feb 2022 00:00:00 UTC')),
          makeDexSwap('aaa125', Date.parse('15 Feb 2022 00:00:00 UTC'))
        ]),
        lastKey: undefined
      })
  })
})

describe('list - pagination', () => {
  beforeAll(async () => {
    for (let i = 0; i < 100; i++) {
      await dexSwapMapper.put(
        makeDexSwap(`bbb${i}`, Date.parse('16 Feb 2022 00:00:00 UTC'))
      )
    }
  })

  it('should paginate', async () => {
    // TODO(eli-lim)
  })
})

function makeDexSwap (id: string, timestampMs: number, values?: Partial<DexSwap>): DexSwap {
  return {
    id,
    timestampMs: timestampMs.toString(),
    txno: 1,
    fromAmount: new BigNumber(10).toFixed(8),
    fromSymbol: 'ABC',
    toAmount: new BigNumber(100).toFixed(8),
    toSymbol: 'DFI',
    block: {
      hash: '',
      height: 0,
      medianTime: 0,
      time: 0
    },
    ...values,
    yyyymmdd: yyyyMmDd(new Date(timestampMs))
  }
}
