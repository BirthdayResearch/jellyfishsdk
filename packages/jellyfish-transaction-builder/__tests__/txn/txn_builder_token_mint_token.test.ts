import { StartFlags } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'
import { OP_CODES, TokenMint } from '@defichain/jellyfish-transaction'
import { Bech32, WIF } from '@defichain/jellyfish-crypto'

const attributeKey = 'ATTRIBUTES'
const symbolDBTC = 'BTC'

describe.skip('Consortium', () => {
  const tGroup = TestingGroup.create(3)
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  const charlie = tGroup.get(2)
  let account0: string
  let idBTC: string, idDOGE: string
  const symbolBTC = 'BTC'
  const symbolDOGE = 'DOGE'

  let aProviders: MockProviders, bProviders: MockProviders
  let aBuilder: P2WPKHTransactionBuilder, bBuilder: P2WPKHTransactionBuilder

  const startFlags: StartFlags[] = [{ name: 'regtest-minttoken-simulate-mainnet', value: 1 }]

  const consortiumMemberA = {
    bech32: 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn',
    privKey: 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
  }
  const consortiumMemberB = {
    bech32: 'bcrt1qf26rj8895uewxcfeuukhng5wqxmmpqp555z5a7',
    privKey: 'cQbfHFbdJNhg3UGaBczir2m5D4hiFRVRKgoU8GJoxmu2gEhzqHtV'
  }

  beforeEach(async () => {
    await tGroup.start({ startFlags })
    await alice.container.waitForWalletCoinbaseMaturity()

    account0 = await alice.generateAddress()

    await alice.token.create({
      symbol: symbolBTC,
      name: symbolBTC,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: account0
    })
    await alice.generate(1)

    await alice.token.create({
      symbol: symbolDOGE,
      name: symbolDOGE,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: account0
    })
    await alice.generate(1)

    idBTC = await alice.token.getTokenId(symbolDBTC)
    idDOGE = await alice.token.getTokenId(symbolDOGE)

    aProviders = await getProviders(alice.container)
    aProviders.setEllipticPair(WIF.asEllipticPair(consortiumMemberA.privKey))
    aBuilder = new P2WPKHTransactionBuilder(aProviders.fee, aProviders.prevout, aProviders.elliptic, RegTest)

    await aProviders.setupMocks()
    await fundEllipticPair(alice.container, aProviders.ellipticPair, 100)

    bProviders = await getProviders(bob.container)
    bProviders.setEllipticPair(WIF.asEllipticPair(consortiumMemberB.privKey))
    bBuilder = new P2WPKHTransactionBuilder(bProviders.fee, bProviders.prevout, bProviders.elliptic, RegTest)

    await bProviders.setupMocks()
    await fundEllipticPair(bob.container, bProviders.ellipticPair, 100)

    await setupGovs()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  async function setupGovs (): Promise<void> {
    await alice.rpc.masternode.setGov({
      [attributeKey]:
      {
        // Enable consortium
        'v0/params/feature/consortium': 'true',
        'v0/params/feature/mint-tokens-to-address': 'true',

        // Set a consortium global limit for dBTC
        [`v0/consortium/${idBTC}/mint_limit`]: '50',
        [`v0/consortium/${idBTC}/mint_limit_daily`]: '40',

        // Set a consortium member for dBTC
        [`v0/consortium/${idBTC}/members`]: {
          '01': {
            name: 'Waves HQ',
            ownerAddress: consortiumMemberA.bech32,
            backingId: 'backing_address_btc_1_c',
            mintLimitDaily: '40.00000000',
            mintLimit: '50.00000000'
          },
          '02': {
            name: 'Alexandria',
            ownerAddress: consortiumMemberB.bech32,
            backingId: 'backing_address_btc_2_c',
            mintLimitDaily: '40.00000000',
            mintLimit: '50.00000000'
          }
        }
      }
    })
    await alice.generate(1)
    await tGroup.waitForSync()
  }

  it('should throw an error if foundation or consortium member authorization is not present', async () => {
    await alice.rpc.masternode.setGov({
      [attributeKey]:
      {
        'v0/params/feature/consortium': 'true'
      }
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    const cProviders = await getProviders(alice.container)
    const cBuilder = new P2WPKHTransactionBuilder(cProviders.fee, cProviders.prevout, cProviders.elliptic, RegTest)

    await charlie.container.waitForWalletCoinbaseMaturity()
    await charlie.token.dfi({ address: await charlie.generateAddress(), amount: 12 })
    await charlie.generate(1)

    await fundEllipticPair(charlie.container, cProviders.ellipticPair, 10)
    await tGroup.waitForSync()
    await cProviders.setupMocks()

    const script = await cProviders.elliptic.script()
    const tokenMint: TokenMint = {
      // Mint 0.5 BTC
      balances: [{ token: Number(idBTC), amount: new BigNumber(0.5) }],
      to: {
        stack: []
      }
    }

    const txn = await cBuilder.tokens.mint(tokenMint, script)
    const promise = sendTransaction(charlie.container, txn)

    await expect(promise).rejects.toThrow("DeFiDRpcError: 'MintTokenTx: You are not a foundation or consortium member and cannot mint this token!', code: -26")
  })

  it('should throw an error if the token is not specified in governance vars', async () => {
    await setupGovs()

    const script = await aProviders.elliptic.script()
    const tokenMint: TokenMint = {
      // Mint 1 DOGE
      balances: [{ token: Number(idDOGE), amount: new BigNumber(1) }],
      to: {
        stack: []
      }
    }

    const txn = await aBuilder.tokens.mint(tokenMint, script)
    const promise = sendTransaction(alice.container, txn)

    await expect(promise).rejects.toThrow("DeFiDRpcError: 'MintTokenTx: You are not a foundation member or token owner and cannot mint this token!', code: -26")
  })

  it('should not mintTokens for non-existent token', async () => {
    await setupGovs()

    const script = await aProviders.elliptic.script()
    const tokenMint: TokenMint = {
      // Mint non-existent token
      balances: [{ token: 22, amount: new BigNumber(1) }],
      to: {
        stack: []
      }
    }

    const txn = await aBuilder.tokens.mint(tokenMint, script)
    const promise = sendTransaction(alice.container, txn)

    await expect(promise).rejects.toThrow("DeFiDRpcError: 'MintTokenTx: token 22 does not exist!', code: -26")
  })

  it('should throw an error if member daily mint limit exceeds', async () => {
    await setupGovs()

    const script = await aProviders.elliptic.script()
    const tokenMint: TokenMint = {
      // Mint 41 BTC
      balances: [{ token: Number(idBTC), amount: new BigNumber(41) }],
      to: {
        stack: []
      }
    }

    const txn = await aBuilder.tokens.mint(tokenMint, script)
    const promise = sendTransaction(alice.container, txn)

    await expect(promise).rejects.toThrow("DeFiDRpcError: 'MintTokenTx: You will exceed your daily mint limit for BTC token by minting this amount', code: -26")
  })

  it('should throw an error if member maximum mint limit exceeds', async () => {
    await setupGovs()

    const script = await aProviders.elliptic.script()
    const tokenMint: TokenMint = {
      // Mint 51 BTC
      balances: [{ token: Number(idBTC), amount: new BigNumber(51) }],
      to: {
        stack: []
      }
    }

    const txn = await aBuilder.tokens.mint(tokenMint, script)
    const promise = sendTransaction(alice.container, txn)

    await expect(promise).rejects.toThrow("DeFiDRpcError: 'MintTokenTx: You will exceed your maximum mint limit for BTC token by minting this amount!', code: -26")
  })

  it('should throw an error if global daily mint limit exceeds', async () => {
    await setupGovs()

    // Hit global daily mint limit
    await alice.rpc.token.mintTokens({ amounts: [`40.0000000@${symbolBTC}`] })
    await alice.generate(1)
    await tGroup.waitForSync()

    const script = await bProviders.elliptic.script()
    const tokenMint: TokenMint = {
      // Mint 1 BTC to hit global daily mint lint
      balances: [{ token: Number(idBTC), amount: new BigNumber(1) }],
      to: {
        stack: []
      }
    }

    const txn = await bBuilder.tokens.mint(tokenMint, script)
    const promise = sendTransaction(bob.container, txn)

    await expect(promise).rejects.toThrow("DeFiDRpcError: 'MintTokenTx: You will exceed global daily maximum consortium mint limit for BTC token by minting this amount.', code: -26")
  })

  it('should throw an error if global mint limit exceeds', async () => {
    await setupGovs()

    // Hit global daily mint limit
    await alice.rpc.token.mintTokens({ amounts: [`40.0000000@${symbolBTC}`] })
    await alice.generate(1)
    await tGroup.waitForSync()

    const script = await bProviders.elliptic.script()
    const tokenMint: TokenMint = {
      // Mint 50 BTC
      balances: [{ token: Number(idBTC), amount: new BigNumber(10) }],
      to: {
        stack: []
      }
    }

    const txn = await bBuilder.tokens.mint(tokenMint, script)
    const promise = sendTransaction(bob.container, txn)

    await expect(promise).rejects.toThrow("MintTokenTx: You will exceed global daily maximum consortium mint limit for BTC token by minting this amount.', code: -26")
  })

  it('should mintTokens', async () => {
    await setupGovs()

    const script = await aProviders.elliptic.script()
    const tokenMint: TokenMint = {
      // Mint 11.5 BTC
      balances: [{ token: Number(idBTC), amount: new BigNumber(11.5) }],
      to: {
        stack: []
      }
    }

    const txn = await aBuilder.tokens.mint(tokenMint, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(alice.container, txn)
    const encoded: string = OP_CODES.OP_DEFI_TX_TOKEN_MINT(tokenMint).asBuffer().toString('hex')
    const pubKey = await aProviders.ellipticPair.publicKey()
    const address = Bech32.fromPubKey(pubKey, 'bcrt')

    expect(outs).toStrictEqual([{
      n: 0,
      scriptPubKey: {
        asm: expect.stringMatching(/^OP_RETURN 446654784d/),
        hex: `6a${encoded}`,
        type: 'nulldata'
      },
      tokenId: 0,
      value: 0
    }, {
      n: 1,
      scriptPubKey: {
        addresses: [address],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      },
      tokenId: 0,
      value: 99.9999929
    }])

    await alice.generate(1)

    // Verify that the amount is minted to consortium member account
    const accAfter = await alice.rpc.account.getAccount(consortiumMemberA.bech32)
    expect(accAfter).toStrictEqual(['11.50000000@BTC'])

    // Verify that the amount reflects to consortium member and token level attributes
    const attr = (await alice.rpc.masternode.getGov(attributeKey)).ATTRIBUTES
    expect(attr[`v0/live/economy/consortium_members/${idBTC}/01/minted`]).toStrictEqual(new BigNumber('11.5'))
    expect(attr[`v0/live/economy/consortium_members/${idBTC}/01/daily_minted`]).toStrictEqual(`0/${new BigNumber(11.5).toFixed(8)}`)
    expect(attr['v0/live/economy/consortium/1/minted']).toStrictEqual(new BigNumber('11.5'))
  })

  it('should allow to mint tokens to an address', async () => {
    await setupGovs()

    const script = P2WPKH.fromAddress(RegTest, consortiumMemberB.bech32, P2WPKH).getScript()
    const tokenMint: TokenMint = {
      // Mint 9.3 BTC
      balances: [{ token: Number(idBTC), amount: new BigNumber(9.3) }],
      to: script
    }

    const txn = await aBuilder.tokens.mint(tokenMint, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(bob.container, txn)
    const encoded: string = OP_CODES.OP_DEFI_TX_TOKEN_MINT(tokenMint).asBuffer().toString('hex')

    expect(outs).toStrictEqual([{
      n: 0,
      scriptPubKey: {
        asm: expect.stringMatching(/^OP_RETURN 446654784d/),
        hex: `6a${encoded}`,
        type: 'nulldata'
      },
      tokenId: 0,
      value: 0
    }, {
      n: 1,
      scriptPubKey: {
        addresses: [consortiumMemberB.bech32],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      },
      tokenId: 0,
      value: 99.9999918
    }])
    await alice.generate(1)

    // Verify that the amount is minted to consortium member account
    const accAfter = (await alice.rpc.account.getAccount(consortiumMemberB.bech32))
    expect(accAfter).toStrictEqual(['9.30000000@BTC'])

    // Verify that the amount reflects to consortium member and token level attributes
    const attr = (await alice.rpc.masternode.getGov(attributeKey)).ATTRIBUTES
    expect(attr[`v0/live/economy/consortium_members/${idBTC}/01/minted`]).toStrictEqual(new BigNumber('9.3'))
    expect(attr[`v0/live/economy/consortium_members/${idBTC}/01/daily_minted`]).toStrictEqual(`0/${new BigNumber(9.3).toFixed(8)}`)
    expect(attr['v0/live/economy/consortium/1/minted']).toStrictEqual(new BigNumber('9.3'))
  })
})
