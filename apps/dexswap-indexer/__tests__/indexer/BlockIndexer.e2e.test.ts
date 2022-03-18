import { DexSwapIndexerTesting } from '../../testing/DexSwapIndexerTesting'

const testsuite = DexSwapIndexerTesting.create()

beforeAll(async () => {
  await testsuite.start()
})

afterAll(async () => {
  await testsuite.stop()
})

it('should start up dependencies (dynamo container, testcontainer and app)', async () => {
  expect((await testsuite.dbContainer.listTables()).TableNames).toEqual([])
})
