import { RegTestContainer } from '@defichain/testcontainers'
import { Client, HttpProvider } from '../src'

const container = new RegTestContainer()

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
})

afterAll(async () => {
  await container.stop()
})

it('url: string provider', async () => {
  const url = await container.getCachedRpcUrl()
  const client = new Client(url)
  const info = await client.mining.getMintingInfo()

  await expect(info.chain).toStrictEqual('regtest')
})

it('HttpProvider', async () => {
  const url = await container.getCachedRpcUrl()
  const client = new Client(new HttpProvider(url))
  const info = await client.mining.getMintingInfo()

  await expect(info.chain).toStrictEqual('regtest')
})
