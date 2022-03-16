import { TestingModule } from '@nestjs/testing'
import { DynamoDbContainer } from '../../testing/containers/DynamoDbContainer'
import { DexSwap, DexSwapService, Sort } from '../../src/models/dftx/DexSwap'
import { BigNumber } from '@defichain/jellyfish-json'
import { modelModuleTesting } from './ModelModuleTesting'

let testingModule: TestingModule
let dexSwapService: DexSwapService
const ddbContainer = new DynamoDbContainer()

beforeAll(async () => {
  await ddbContainer.start()

  testingModule = await modelModuleTesting(
    await ddbContainer.getHostPort()
  ).compile()

  await testingModule.init()
  dexSwapService = testingModule.get(DexSwapService)
})

afterAll(async () => {
  await ddbContainer.stop()
  await testingModule.close()
})

it('should create and read a dex swap', async () => {
  const dexSwap = makeDexSwap('aaa123', Date.parse('14 Feb 2022 00:00:00 UTC'))
  await dexSwapService.upsert(dexSwap)
  expect({ ...await dexSwapService.get('aaa123') }).toStrictEqual(dexSwap)
})

it('should delete', async () => {
  const dexSwap = makeDexSwap('aaa124', Date.parse('14 Feb 2022 00:00:00 UTC'))
  await dexSwapService.upsert(dexSwap)

  await dexSwapService.delete('aaa124')
  expect(await dexSwapService.get('aaa124')).toBeUndefined()
})

describe('list - ordering', () => {
  beforeAll(async () => {
    await dexSwapService.upsert(makeDexSwap('aaa127', Date.parse('15 Feb 2022 00:00:01 UTC')))
    // Should be able to handle overlapping time
    await dexSwapService.upsert(makeDexSwap('aaa126', Date.parse('15 Feb 2022 00:00:00 UTC')))
    await dexSwapService.upsert(makeDexSwap('aaa125', Date.parse('15 Feb 2022 00:00:00 UTC')))
    await dexSwapService.upsert(makeDexSwap('aaa128', Date.parse('15 Feb 2022 00:00:02 UTC')))
  })

  it('should list in ascending order (by default)', async () => {
    expect(await dexSwapService.list(new Date(Date.parse('15 Feb 2022 00:00:00 UTC'))))
      .toEqual({
        dexSwaps: [
          makeDexSwap('aaa125', Date.parse('15 Feb 2022 00:00:00 UTC')),
          makeDexSwap('aaa126', Date.parse('15 Feb 2022 00:00:00 UTC')),
          makeDexSwap('aaa127', Date.parse('15 Feb 2022 00:00:01 UTC')),
          makeDexSwap('aaa128', Date.parse('15 Feb 2022 00:00:02 UTC'))
        ]
      })
  })

  it('should list in descending order', async () => {
    expect(await dexSwapService.list(new Date(Date.parse('15 Feb 2022 00:00:00 UTC')), Sort.desc))
      .toEqual({
        dexSwaps: [
          makeDexSwap('aaa128', Date.parse('15 Feb 2022 00:00:02 UTC')),
          makeDexSwap('aaa127', Date.parse('15 Feb 2022 00:00:01 UTC')),
          makeDexSwap('aaa126', Date.parse('15 Feb 2022 00:00:00 UTC')),
          makeDexSwap('aaa125', Date.parse('15 Feb 2022 00:00:00 UTC'))
        ]
      })
  })
})

describe('list - pagination', () => {
  beforeAll(async () => {
    for (let i = 0; i < 100; i++) {
      await dexSwapService.upsert(
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
    ...values
  }
}
