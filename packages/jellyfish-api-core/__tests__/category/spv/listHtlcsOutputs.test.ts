import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Spv', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.spv.fundAddress(await testing.rpc.spv.getNewAddress()) // Funds 1 BTC
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listHtlcOutputs', async () => {
    const pubKeyA = await testing.rpc.spv.getAddressPubKey(await testing.rpc.spv.getNewAddress())
    const pubKeyB = await testing.rpc.spv.getAddressPubKey(await testing.rpc.spv.getNewAddress())
    const timeout = 10
    const seed = 'aba5f7e9aecf6ec4372c8a1e49562680d066da4655ee8b4bb01640479fffeaa8'
    const seedhash = 'df95183883789f237977543885e1f82ddc045a3ba90c8f25b43a5b797a35d20e'

    const htlc = await testing.rpc.spv.createHtlc(pubKeyA, pubKeyB, { timeout: `${timeout}`, seedhash })
    await testing.container.generate(1)
    const fund = await testing.rpc.spv.sendToAddress(htlc.address, new BigNumber(0.1)) // Funds HTLC address
    const claim = await testing.rpc.spv.claimHtlc(
      htlc.address,
      await testing.rpc.spv.getNewAddress(),
      { seed }
    )

    const list = await testing.rpc.spv.listHtlcOutputs()
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

  it('listHtlcOutputs should return empty list when called with a non HTLC address', async () => {
    const pubKeyA = await testing.rpc.spv.getAddressPubKey(await testing.rpc.spv.getNewAddress())
    const pubKeyB = await testing.rpc.spv.getAddressPubKey(await testing.rpc.spv.getNewAddress())
    const timeout = 10
    const seed = 'aba5f7e9aecf6ec4372c8a1e49562680d066da4655ee8b4bb01640479fffeaa8'
    const seedhash = 'df95183883789f237977543885e1f82ddc045a3ba90c8f25b43a5b797a35d20e'

    const htlc = await testing.rpc.spv.createHtlc(pubKeyA, pubKeyB, { timeout: `${timeout}`, seedhash })
    await testing.container.generate(1)
    await testing.rpc.spv.sendToAddress(htlc.address, new BigNumber(0.1)) // Funds HTLC address
    await testing.rpc.spv.claimHtlc(
      htlc.address,
      await testing.rpc.spv.getNewAddress(),
      { seed }
    )

    const list = await testing.rpc.spv.listHtlcOutputs(await testing.rpc.spv.getNewAddress())
    expect(list.length).toStrictEqual(0)
  })

  it('should not listHtlcOutputs with invalid public address', async () => {
    const promise = testing.rpc.spv.listHtlcOutputs('XXXX')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid address', code: -5, method: spv_listhtlcoutputs")
  })
})

describe('Spv with multiple HTLC', () => {
  const testing = Testing.create(new MasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.spv.fundAddress(await testing.rpc.spv.getNewAddress()) // Funds 1 BTC
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listHtlcOutputs with multiple HTLC', async () => {
    const pubKeyA = await testing.rpc.spv.getAddressPubKey(await testing.rpc.spv.getNewAddress())
    const pubKeyB = await testing.rpc.spv.getAddressPubKey(await testing.rpc.spv.getNewAddress())
    const timeout = 10
    const seedhash = 'df95183883789f237977543885e1f82ddc045a3ba90c8f25b43a5b797a35d20e'

    const htlc = await testing.rpc.spv.createHtlc(pubKeyA, pubKeyB, { timeout: `${timeout}`, seedhash })
    const htlc2 = await testing.rpc.spv.createHtlc(pubKeyA, pubKeyB, { timeout: `${timeout}`, seedhash }) // Creates a second HTLC
    await testing.container.generate(1)
    const fund = await testing.rpc.spv.sendToAddress(htlc.address, new BigNumber(0.1)) // Funds HTLC address
    const fund2 = await testing.rpc.spv.sendToAddress(htlc2.address, new BigNumber(0.1)) // Funds second HTLC address

    const list = await testing.rpc.spv.listHtlcOutputs()
    expect(list.length).toStrictEqual(2)
    expect(list[0]).toStrictEqual({
      txid: fund.txid,
      vout: expect.any(Number),
      amount: new BigNumber(0.1),
      address: htlc.address,
      confirms: 1
    })
    expect(list[1]).toStrictEqual({
      txid: fund2.txid,
      vout: expect.any(Number),
      amount: new BigNumber(0.1),
      address: htlc2.address,
      confirms: 1
    })
  })

  it('should listHtlcOutputs with specific HTLC address as filter', async () => {
    const pubKeyA = await testing.rpc.spv.getAddressPubKey(await testing.rpc.spv.getNewAddress())
    const pubKeyB = await testing.rpc.spv.getAddressPubKey(await testing.rpc.spv.getNewAddress())
    const timeout = 10
    const seed = 'aba5f7e9aecf6ec4372c8a1e49562680d066da4655ee8b4bb01640479fffeaa8'
    const seedhash = 'df95183883789f237977543885e1f82ddc045a3ba90c8f25b43a5b797a35d20e'

    const htlc = await testing.rpc.spv.createHtlc(pubKeyA, pubKeyB, { timeout: `${timeout}`, seedhash })
    await testing.container.generate(1)
    const fund = await testing.rpc.spv.sendToAddress(htlc.address, new BigNumber(0.1)) // Funds HTLC address
    const claim = await testing.rpc.spv.claimHtlc(
      htlc.address,
      await testing.rpc.spv.getNewAddress(),
      { seed }
    )

    const list = await testing.rpc.spv.listHtlcOutputs(htlc.address)
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
})
