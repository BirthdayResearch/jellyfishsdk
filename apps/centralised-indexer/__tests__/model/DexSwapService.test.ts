import { TestingModule } from '@nestjs/testing'
import { DynamoDbContainer } from '../../testing/containers/DynamoDbContainer'
import { DexSwapService } from '../../src/models/dftx/DexSwap'
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
  const dexSwap = {
    id: 'aaa123',
    timestamp: Date.now().toString(),
    txid: '',
    txno: 1,
    fromAmount: new BigNumber(10),
    fromSymbol: 'ABC',
    toAmount: new BigNumber(100),
    toSymbol: 'DFI',
    block: {
      hash: '',
      height: 0,
      medianTime: 0,
      time: 0
    }
  }
  await dexSwapService.upsert(dexSwap)
  expect({ ...await dexSwapService.get('aaa123') }).toStrictEqual(dexSwap)
})

it('should delete', async () => {
  const dexSwap = {
    id: 'aaa124',
    timestamp: Date.now().toString(),
    txid: '',
    txno: 1,
    fromAmount: new BigNumber(10),
    fromSymbol: 'ABC',
    toAmount: new BigNumber(100),
    toSymbol: 'DFI',
    block: {
      hash: '',
      height: 0,
      medianTime: 0,
      time: 0
    }
  }
  await dexSwapService.upsert(dexSwap)
  await dexSwapService.delete('aaa124')
  expect(await dexSwapService.get('aaa124')).toBeUndefined()
})
