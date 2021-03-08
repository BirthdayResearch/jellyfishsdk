import { MintingInfo, JellyfishError, JellyfishClient } from '../src/core'

class TestClient extends JellyfishClient {
  async call<T> (method: string, payload: any[]): Promise<T> {
    throw new JellyfishError({})
  }
}

it('should export client', async () => {
  const client = new TestClient()
  return await expect(client.call('fail', []))
    .rejects.toThrowError(JellyfishError)
})

it('should export categories', async () => {
  const client = new TestClient()
  return await expect(async () => {
    const info: MintingInfo = await client.mining.getMintingInfo()
    console.log(info)
  }).rejects.toThrowError(JellyfishError)
})
