import { PlaygroundTesting } from '../testing/PlaygroundTesting'
import { FoundationKeys } from '../src/FoundationBot'

const playgroundTesting = PlaygroundTesting.create()

beforeAll(async () => {
  await playgroundTesting.start()
  await playgroundTesting.bootstrap()
})

afterAll(async () => {
  await playgroundTesting.stop()
})

it('should have all foundation keys after bootstrap', async () => {
  for (const key of FoundationKeys) {
    {
      const info = await playgroundTesting.rpc.wallet.getAddressInfo(key.owner.address)
      expect(info).toBeDefined()

      const privKey = await playgroundTesting.rpc.wallet.dumpPrivKey(key.owner.address)
      expect(privKey).toStrictEqual(key.owner.privKey)
    }

    {
      const info = await playgroundTesting.rpc.wallet.getAddressInfo(key.operator.address)
      expect(info).toBeDefined()

      const privKey = await playgroundTesting.rpc.wallet.dumpPrivKey(key.operator.address)
      expect(privKey).toStrictEqual(key.operator.privKey)
    }
  }
})
