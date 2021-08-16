import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('Spv', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.call('spv_fundaddress', [await container.call('spv_getnewaddress')]) // Funds 1 BTC
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listHtlcOutputs', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const timeout = 10
    const seed = 'aba5f7e9aecf6ec4372c8a1e49562680d066da4655ee8b4bb01640479fffeaa8'
    const seedhash = 'df95183883789f237977543885e1f82ddc045a3ba90c8f25b43a5b797a35d20e'

    const htlc = await client.spv.createHtlc(pubKeyA, pubKeyB, { timeout: `${timeout}`, seedhash })
    await container.generate(1)
    const fund = await container.call('spv_sendtoaddress', [htlc.address, 0.1]) // Funds HTLC address
    const claim = await client.spv.claimHtlc(
      htlc.address,
      await container.call('spv_getnewaddress'),
      { seed }
    )

    const list = await client.spv.listHtlcOutputs()
    expect(list.length).toStrictEqual(1)
    expect(list[0]).toStrictEqual({
      txid: fund.txid,
      vout: expect.any(Number),
      amount: new BigNumber(0.1),
      address: htlc.address,
      confirms: 1,
      spent: {
        txid: claim.txid,
        confirms: 1
      }
    })
  })

  it('listHtlcOutputs should return empty list when called with a new address', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const timeout = 10
    const seed = 'aba5f7e9aecf6ec4372c8a1e49562680d066da4655ee8b4bb01640479fffeaa8'
    const seedhash = 'df95183883789f237977543885e1f82ddc045a3ba90c8f25b43a5b797a35d20e'

    const htlc = await client.spv.createHtlc(pubKeyA, pubKeyB, { timeout: `${timeout}`, seedhash })
    await container.generate(1)
    await container.call('spv_sendtoaddress', [htlc.address, 0.1]) // Funds HTLC address
    await client.spv.claimHtlc(
      htlc.address,
      await container.call('spv_getnewaddress'),
      { seed }
    )

    const list = await client.spv.listHtlcOutputs(await container.call('spv_getnewaddress'))
    expect(list.length).toStrictEqual(0)
  })

  it('should not listHtlcOutputs with invalid public address', async () => {
    const promise = client.spv.listHtlcOutputs('XXXX')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid address', code: -5, method: spv_listhtlcoutputs")
  })
})
