import { Network } from 'testcontainers'
import { NativeChainContainer, StartedNativeChainContainer } from '../../../src'
import waitForExpect from 'wait-for-expect'

describe('coinbase maturity faster by time travel', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    const network = await new Network().start()
    container = await new NativeChainContainer()
      .withNetwork(network)
      .withPreconfiguredRegtestMasternode()
      .withStartupTimeout(180_000)
      .start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should speed up coinbase maturity', async () => {
    await container.waitFor.walletCoinbaseMaturity()
  })
})

describe('nativechain coinbase maturity', () => {
  let container: StartedNativeChainContainer

  beforeAll(async () => {
    const startedNetwork = await new Network().start()
    container = await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withPreconfiguredRegtestMasternode()
      .withStartupTimeout(180_000)
      .start()

    await container.waitFor.walletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait until coinbase maturity with spendable balance', async () => {
    await waitForExpect(async () => {
      const info = await container.rpc.getMiningInfo()
      expect(info.blocks).toBeGreaterThan(100)
    })

    await container.rpc.generate(3)

    await waitForExpect(async () => {
      const balance = await container.rpc.call('getbalance')
      expect(balance).toBeGreaterThan(100)
    })
  })

  it('should be able to perform amk rpc feature', async () => {
    await container.rpc.generate(5)

    const address = await container.rpc.getNewAddress()
    const payload: { [key: string]: string } = {}
    payload[address] = '100@0'
    await container.rpc.call('utxostoaccount', [payload])
  })

  it('should be able to wait for balance to be gte 200', async () => {
    await container.waitFor.walletBalanceGTE(200)

    const balance = await container.rpc.call('getbalance')
    expect(balance).toBeGreaterThanOrEqual(200)
  })

  it('should be able to fund an address for testing', async () => {
    const address = 'bcrt1ql0ys2ahu4e9uhjn2l0mehhh4e0mmh7npyhx0re'
    const privKey = 'cPuytfxySwc9RVrFpqQ9xheZ6jCmJD6pEe3XUPvev5hBwheivH5C'
    await container.waitFor.walletBalanceGTE(100)

    const { txid, vout } = await container.rpc.fundAddress(address, 10)
    await container.rpc.call('importprivkey', [privKey])
    return await waitForExpect(async () => {
      const unspent = await container.rpc.call('listunspent', [
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
    const {
      address,
      privKey,
      pubKey
    } = await container.rpc.newAddressKeys()
    await container.waitFor.walletBalanceGTE(10)
    const { txid } = await container.rpc.fundAddress(address, 1)

    const dumpprivkey = await container.rpc.call('dumpprivkey', [address])
    expect(dumpprivkey).toStrictEqual(privKey)

    const getaddressinfo = await container.rpc.call('getaddressinfo', [address])
    expect(getaddressinfo.pubkey).toStrictEqual(pubKey)

    return await waitForExpect(async () => {
      const unspent = await container.rpc.call('listunspent', [
        0, 9999999, [address]
      ])
      expect(unspent[0].txid).toStrictEqual(txid)
    })
  })
})
