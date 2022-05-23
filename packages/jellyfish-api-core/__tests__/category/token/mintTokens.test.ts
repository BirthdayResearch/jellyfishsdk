import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '../../../src'
import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Token', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let from: string

  async function setup (): Promise<void> {
    from = await container.getNewAddress()

    await createToken(from, 'DBTC')
    await testing.generate(1)
  }

  async function createToken (address: string, symbol: string): Promise<void> {
    const defaultMetadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await testing.rpc.token.createToken(defaultMetadata)
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should mintTokens', async () => {
    let tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).not.toContain('7.00000000@1')

    const txid = await testing.rpc.token.mintTokens('7@DBTC')
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).toContain('7.00000000@1')
  })

  it('should mintTokens with 1 satoshi', async () => {
    let tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).not.toContain('0.00000001@2')

    const txid = await testing.rpc.token.mintTokens('0.00000001@DETH')
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).toContain('0.00000001@2')
  })

  it('should mintTokens with utxos', async () => {
    let tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).not.toContain('6.00000000@3')

    const utxo = await container.fundAddress(from, 10)

    const txid = await testing.rpc.token.mintTokens('6@DBSC', [utxo])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)

    tokenBalances = await testing.rpc.account.getTokenBalances()
    expect(tokenBalances).toContain('6.00000000@3')
  })

  it('should not mintTokens if quantity is 0', async () => {
    const promise = testing.rpc.token.mintTokens('0@DBTC')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Amount out of range')
  })

  it('should not mintTokens if quantity is -1', async () => {
    const promise = testing.rpc.token.mintTokens('-1@DBTC')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Amount out of range')
  })

  it('should not mintTokens if quantity is less than 1 satoshi', async () => {
    const promise = testing.rpc.token.mintTokens('0.000000001@DBTC')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid amount')
  })

  it('should not mintTokens for non-existence token', async () => {
    const promise = testing.rpc.token.mintTokens('5@BTC')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: BTC\', code: 0, method: minttokens')
  })

  it('should not mintTokens if parameter is an arbitrary string', async () => {
    const promise = testing.rpc.token.mintTokens('abcde')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid amount')
  })

  it('should not mintTokens with arbitrary UTXOs', async () => {
    const utxo = await container.fundAddress(await testing.generateAddress(), 10)

    const promise = testing.rpc.token.mintTokens('5@DETH', [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Test MintTokenTx execution failed:\nYou are not a foundation or consortium member and cannot mint this token!')
  })
})

describe('Token with gov attributes', () => {
  const tGroup = TestingGroup.create(4, i => new MasterNodeRegTestContainer(RegTestFoundationKeys[i]))

  const CONSORTIUM_MEMBERS = 'v0/consortium/1/members'
  const CONSORTIUM_MINT_LIMIT = 'v0/consortium/1/mint_limit'

  let alice: Testing
  let bob: Testing
  let john: Testing

  beforeEach(async () => {
    await tGroup.start()

    alice = tGroup.get(0)
    bob = tGroup.get(2)
    john = tGroup.get(3)

    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  let account0: string
  // let account2: string
  let account3: string

  async function setup (): Promise<void> {
    account0 = GenesisKeys[0].owner.address // Foundation address
    // account2 = GenesisKeys[2].owner.address // Non foundation address
    account3 = GenesisKeys[3].owner.address // Non foundation address

    await alice.token.create(
      {
        symbol: 'DBTC',
        name: 'BTC token',
        isDAT: true,
        collateralAddress: account0
      }
    )
    await alice.generate(1)

    await alice.token.create(
      {
        symbol: 'DETH',
        name: 'ETH token',
        isDAT: true,
        collateralAddress: account0
      }
    )
    await alice.generate(1)

    await alice.rpc.wallet.sendToAddress(account3, 10)
    await alice.generate(1)

    await alice.generate(6) // Generate 6 blocks to reach greatworldheight

    const blockCount = await alice.rpc.blockchain.getBlockCount()
    expect(blockCount).toStrictEqual(110) // Equal to greatworldheight
  }

  describe('should mintTokens if amount = member limit and amount = global limit', () => {
    it('should mintTokens', async () => {
      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":1.10000000}}` } })
      await alice.generate(1)

      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '110000000' } }) // 1.1
      await alice.generate(1)

      await tGroup.waitForSync()

      const txid = await john.rpc.token.mintTokens('1.1@DBTC')
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
    })

    it('should not mintTokens if bob is neither the foundation member not an authorized consortium member', async () => {
      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":1.10000000}}` } })
      await alice.generate(1)

      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '110000000' } }) // 1.1
      await alice.generate(1)

      await tGroup.waitForSync()

      const promise = bob.rpc.token.mintTokens('1.1@DBTC')
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Need foundation or consortium member authorization!')
    })

    it('should not mintTokens if alice does not own token', async () => {
      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"2":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":1.10000000}}` } })
      await alice.generate(1)

      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '110000000' } }) // 1.1
      await alice.generate(1)

      await tGroup.waitForSync()

      const promise = john.rpc.token.mintTokens('1.1@DETH')
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Need foundation or consortium member authorization!')
    })
  })

  it('should mintTokens if amount < member limit and amount < global limit', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":6.10000000}}` } })
    await alice.generate(1)

    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '610000000' } }) // 6.1
    await alice.generate(1)

    await tGroup.waitForSync()

    const txid = await john.rpc.token.mintTokens('6@DBTC')
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
  })

  it('should mintTokens if amount = member limit and amount < global limit', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":5.00000000}}` } })
    await alice.generate(1)

    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '5000000000' } }) // 5.1
    await alice.generate(1)

    await tGroup.waitForSync()

    const txid = await john.rpc.token.mintTokens('5@DBTC')
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
  })

  it('should not mintTokens if amount > member limit and amount > global limit', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":7.10000000}}` } })
    await alice.generate(1)

    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '710000000' } }) // 7.1
    await alice.generate(1)

    await tGroup.waitForSync()

    const promise = john.rpc.token.mintTokens('8.1@DBTC')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('You will exceed your maximum mint limit for DBTC token by minting this amount')
  })

  it('should not mintTokens if amount > member limit and amount = global limit', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":2.00000000}}` } })
    await alice.generate(1)

    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '210000000' } }) // 2.1
    await alice.generate(1)

    await tGroup.waitForSync()

    const promise = john.rpc.token.mintTokens('2.1@DBTC')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('You will exceed your maximum mint limit for DBTC token by minting this amount')
  })

  it('should not mintTokens if amount < member limit and amount = global limit', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":3.10000000}}` } })
    await alice.generate(1)

    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '300000000' } }) // 3
    await alice.generate(1)

    await tGroup.waitForSync()

    const promise = john.rpc.token.mintTokens('3.1@DBTC')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Test MintTokenTx execution failed:\nYou will exceed global maximum consortium mint limit for DBTC token by minting this amount!')
  })

  it('should not mintTokens if amount = member limit and amount > global limit', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":4.10000000}}` } })
    await alice.generate(1)

    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '400000000' } }) // 4.1
    await alice.generate(1)

    await tGroup.waitForSync()

    const promise = john.rpc.token.mintTokens('4.1@DBTC')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Test MintTokenTx execution failed:\nYou will exceed global maximum consortium mint limit for DBTC token by minting this amount!')
  })

  it('should not mintTokens if amount < member limit and amount > global limit', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":8.20000000}}` } })
    await alice.generate(1)

    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '800000000' } }) // 8.0
    await alice.generate(1)

    await tGroup.waitForSync()

    const promise = john.rpc.token.mintTokens('8.1@DBTC')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Test MintTokenTx execution failed:\nYou will exceed global maximum consortium mint limit for DBTC token by minting this amount!')
  })

  it('should not mintTokens if amount > member limit and amount < global limit', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":9.00000000}}` } })
    await alice.generate(1)

    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '920000000' } }) // 9.2
    await alice.generate(1)

    await tGroup.waitForSync()

    const promise = john.rpc.token.mintTokens('9.1@DBTC')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('You will exceed your maximum mint limit for DBTC token by minting this amount')
  })

  it('should not mintTokens if amount = member limit and global limit is not set', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"1":{"name":"test","ownerAddress":"${account3}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":10.10000000}}` } })
    await alice.generate(1)

    await tGroup.waitForSync()

    const promise = john.rpc.token.mintTokens('10.1@DBTC')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('You will exceed your maximum mint limit for DBTC token by minting this amount')
  })

  it('should not mintTokens if member limit is not set and amount = global limit', async () => {
    await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '1110000000' } }) // 11.1
    await alice.generate(1)

    await tGroup.waitForSync()

    const promise = john.rpc.token.mintTokens('11.1@DBTC')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Need foundation or consortium member authorization!')
  })
})
