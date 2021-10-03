import { OceanApiTesting } from '../../testing/OceanApiTesting'

const apiTesting = OceanApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
})

afterAll(async () => {
  await apiTesting.stop()
})

it('should be fixed fee of 0.00005000 when there are no transactions', async () => {
  const feeRate = await apiTesting.client.fee.estimate(10)
  expect(feeRate).toStrictEqual(0.00005000)
})
