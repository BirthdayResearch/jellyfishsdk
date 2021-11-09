import { MasterNodeRegTestContainer } from '../../../src'
import waitForExpect from 'wait-for-expect'

describe('coinbase maturity', () => {
  const container = new MasterNodeRegTestContainer()

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait until coinbase maturity with spendable balance', async () => {
    await waitForExpect(async () => {
      const info = await container.getMiningInfo()
      expect(info.blocks).toBeGreaterThan(100)
    })

    await container.generate(3)

    await waitForExpect(async () => {
      const balance = await container.call('getbalance')
      expect(balance).toBeGreaterThan(100)
    })
  })

  it('should be able to perform amk rpc feature', async () => {
    await container.generate(5)

    const address = await container.getNewAddress()
    const payload: { [key: string]: string } = {}
    payload[address] = '100@0'
    await container.call('utxostoaccount', [payload])
  })

  it('should be able to wait for balance to be gte 200', async () => {
    await container.waitForWalletBalanceGTE(200)

    const balance = await container.call('getbalance')
    expect(balance).toBeGreaterThanOrEqual(200)
  })

  it('should be able to fund an address for testing', async () => {
    const address = 'bcrt1ql0ys2ahu4e9uhjn2l0mehhh4e0mmh7npyhx0re'
    const privKey = 'cPuytfxySwc9RVrFpqQ9xheZ6jCmJD6pEe3XUPvev5hBwheivH5C'
    await container.waitForWalletBalanceGTE(100)

    const { txid, vout } = await container.fundAddress(address, 10)
    await container.call('importprivkey', [privKey])
    return await waitForExpect(async () => {
      const unspent = await container.call('listunspent', [
        0, 9999999, [address]
      ])

      expect(unspent[0].txid).toStrictEqual(txid)
      expect(unspent[0].vout).toStrictEqual(vout)
      expect(unspent[0].address).toStrictEqual(address)
      expect(unspent[0].amount).toStrictEqual(10)

      expect(unspent[0].spendable).toStrictEqual(true)
      expect(unspent[0].solvable).toStrictEqual(true)
    })
  })

  it('should be able to get new address and priv/pub key for testing', async () => {
    const { address, privKey, pubKey } = await container.newAddressKeys()
    await container.waitForWalletBalanceGTE(10)
    const { txid } = await container.fundAddress(address, 1)

    const dumpprivkey = await container.call('dumpprivkey', [address])
    expect(dumpprivkey).toStrictEqual(privKey)

    const getaddressinfo = await container.call('getaddressinfo', [address])
    expect(getaddressinfo.pubkey).toStrictEqual(pubKey)

    return await waitForExpect(async () => {
      const unspent = await container.call('listunspent', [
        0, 9999999, [address]
      ])
      expect(unspent[0].txid).toStrictEqual(txid)
    })
  })
})
