import { TokenService } from '../../src/models/dftx/Token'
import { DynamoDbContainer } from '../../testing/containers/DynamoDbContainer'
import { modelModuleTesting } from './ModelModuleTesting'
import { TestingModule } from '@nestjs/testing'

let tokenService: TokenService
const ddbContainer = new DynamoDbContainer()
let testingModule: TestingModule

beforeAll(async () => {
  await ddbContainer.start()

  testingModule = await modelModuleTesting(
    await ddbContainer.getHostPort()
  ).compile()

  await testingModule.init()
  tokenService = testingModule.get(TokenService)
})

afterAll(async () => {
  await ddbContainer.stop()
  await testingModule.close()
})

it('should create and read a token', async () => {
  const token = {
    id: 1,
    decimal: 1,
    isDAT: true,
    isLPS: false,
    limit: '0.00001',
    mintable: false,
    name: 'ABC token',
    symbol: 'ABC',
    tradeable: false,
    block: {
      hash: 'abcdef',
      height: 1,
      medianTime: 1,
      time: 1
    }
  }

  await tokenService.upsert(token)
  expect({ ...await tokenService.get(1) }).toStrictEqual(token)
})

it('should get by symbol', async () => {
  const token = {
    id: 4,
    decimal: 1,
    isDAT: true,
    isLPS: false,
    limit: '0.00001',
    mintable: false,
    name: 'CAT token',
    symbol: 'CAT',
    tradeable: false,
    block: {
      hash: 'abcdef',
      height: 1,
      medianTime: 1,
      time: 1
    }
  }

  await tokenService.upsert(token)
  expect({ ...await tokenService.getBySymbol('CAT') }).toStrictEqual(token)
})

it('should return undefined for non-existent token id', async () => {
  expect(await tokenService.get(100)).toStrictEqual(undefined)
})

it('should delete a token', async () => {
  const token = {
    id: 2,
    decimal: 1,
    isDAT: true,
    isLPS: false,
    limit: '0.00001',
    mintable: false,
    name: 'DEF token',
    symbol: 'DEF',
    tradeable: false,
    block: {
      hash: 'abcdef',
      height: 1,
      medianTime: 1,
      time: 1
    }
  }

  await tokenService.upsert(token)
  await tokenService.delete(2)
  expect(await tokenService.get(2)).toBeUndefined()
})

it('should get next id for DAT and DST', async () => {
  const token = {
    id: 3,
    decimal: 1,
    isDAT: true,
    isLPS: false,
    limit: '0.00001',
    mintable: false,
    name: 'DEF token',
    symbol: 'DEF',
    tradeable: false,
    block: {
      hash: 'abcdef',
      height: 1,
      medianTime: 1,
      time: 1
    }
  }

  await tokenService.upsert(token)
  expect(await tokenService.getNextTokenID(true)).toStrictEqual(5)
  expect(await tokenService.getNextTokenID(false)).toStrictEqual(128)
})
