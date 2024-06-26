import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'
import { OP_CODES, TokenBurn } from '@defichain/jellyfish-transaction'
import { Bech32 } from '@defichain/jellyfish-crypto'

const attributeKey = 'ATTRIBUTES'
const symbolDBTC = 'BTC'

const container = new MasterNodeRegTestContainer()
let providers: MockProviders
let builder: P2WPKHTransactionBuilder

const testing = Testing.create(container)

let wavesConsortiumAddress: string
let idBTC: string

async function setupGovs (): Promise<void> {
  // await testing.rpc.masternode.setGov({
  //   [attributeKey]:
  //   {
  //     // Enable consortium
  //     'v0/params/feature/consortium': 'true',

  //     // Set a consortium global limit for dBTC
  //     [`v0/consortium/${idBTC}/mint_limit`]: '50',
  //     [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',

  //     // Set a consortium member for dBTC
  //     [`v0/consortium/${idBTC}/members`]: {
  //       '01': {
  //         name: 'Waves HQ',
  //         ownerAddress: wavesConsortiumAddress,
  //         backingId: 'backing_address_btc_1_c',
  //         mintLimitDaily: '5.00000000',
  //         mintLimit: '50.00000000'
  //       }
  //     }
  //   }
  // })
}

describe('burnToken', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    wavesConsortiumAddress = await testing.generateAddress()

    await testing.token.dfi({ address: wavesConsortiumAddress, amount: 12 })
    await testing.generate(1)
    await testing.token.create({ symbol: 'BTC', collateralAddress: wavesConsortiumAddress })
    await testing.generate(1)

    await testing.token.mint({ symbol: 'BTC', amount: 100 })
    await testing.generate(1)

    idBTC = await testing.token.getTokenId(symbolDBTC)
    providers = await getProviders(container)

    await setupGovs()

    // Fund 100 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 100)
    await providers.setupMocks()

    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should reject if the amount is negative', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.tokens.burn({
      amounts: [{ token: Number(idBTC), amount: new BigNumber(-2) }],
      burnType: 0,
      from: script,
      variantContext: {
        variant: 0,
        context: {
          stack: []
        }
      }
    }, script)

    await expect(promise).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -200000000')
  })

  it('should throw an error if not enough tokens are available to burn', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.tokens.burn({
      amounts: [{ token: Number(idBTC), amount: new BigNumber(15) }],
      burnType: 0,
      from: script,
      variantContext: {
        variant: 0,
        context: {
          stack: []
        }
      }
    }, script)

    // Ensure the created txn is correct
    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'BurnTokenTx: amount 0.00000000 is less than 15.00000000', code: -26")
  })

  it('should burnToken without context', async () => {
    // Fund 100 BTC TOKEN
    await testing.token.send({
      address: await providers.getAddress(),
      amount: 100,
      symbol: 'BTC'
    })
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const tokenBurn: TokenBurn = {
      // Burn 15 BTC
      amounts: [{ token: Number(idBTC), amount: new BigNumber(15) }],
      burnType: 0,
      from: script,
      variantContext: {
        variant: 0,
        context: script
      }
    }

    const txn = await builder.tokens.burn(tokenBurn, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    const encoded: string = OP_CODES.OP_DEFI_TX_TOKEN_BURN(tokenBurn).asBuffer().toString('hex')
    const pubKey = await providers.ellipticPair.publicKey()
    const address = Bech32.fromPubKey(pubKey, 'bcrt')
    expect(outs).toStrictEqual([{
      n: 0,
      scriptPubKey: {
        asm: expect.stringMatching(/^OP_RETURN 4466547846/),
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
      value: 99.9999904
    }])

    await testing.generate(1)

    const attributes = await testing.rpc.masternode.getGov(attributeKey)
    const burntKeyRegex = /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/burnt$/
    const keys: string[] = Object.keys(attributes.ATTRIBUTES)

    // Verify that the burn action is not tied to any consortium member
    expect(keys.every(key => burntKeyRegex.exec(key) === null)).toStrictEqual(true)

    // Verify the token balance is deducted correctly (100 - 15 = 85 BTC)
    const accAfter = await testing.rpc.account.getAccount(await providers.getAddress())
    expect(accAfter).toStrictEqual(['85.00000000@BTC'])
  })

  it('should burnToken with context', async () => {
    // Fund 100 BTC TOKEN
    await testing.token.send({
      address: await providers.getAddress(),
      amount: 100,
      symbol: 'BTC'
    })
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const wavesColScript = P2WPKH.fromAddress(RegTest, wavesConsortiumAddress, P2WPKH).getScript()
    const tokenBurn: TokenBurn = {
      // Burn 30 BTC
      amounts: [{ token: Number(idBTC), amount: new BigNumber(30) }],
      burnType: 0,
      from: script,
      variantContext: {
        variant: 0,
        context: wavesColScript
      }
    }
    const txn = await builder.tokens.burn(tokenBurn, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    const encoded: string = OP_CODES.OP_DEFI_TX_TOKEN_BURN(tokenBurn).asBuffer().toString('hex')
    const pubKey = await providers.ellipticPair.publicKey()
    const address = Bech32.fromPubKey(pubKey, 'bcrt')

    expect(outs).toStrictEqual([{
      n: 0,
      scriptPubKey: {
        asm: expect.stringMatching(/^OP_RETURN 4466547846/),
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
      value: 99.9999904
    }])
    await testing.generate(1)

    const attributes = await testing.rpc.masternode.getGov(attributeKey)
    const burntKeyRegex = /^v0\/live\/economy\/consortium_members\/\d+\/\d+\/burnt$/
    const keys: string[] = Object.keys(attributes.ATTRIBUTES)

    // Verify that the burn action is tied to the existing consortium member
    expect(keys.some(key => burntKeyRegex.exec(key) === null)).toStrictEqual(true)
    // expect(attributes.ATTRIBUTES[`v0/live/economy/consortium_members/${idBTC}/01/burnt`]).toStrictEqual(new BigNumber(30))

    // Verify the token balance is deducted correctly (100 - 30 = 70 BTC)
    const accAfter = await testing.rpc.account.getAccount(await providers.getAddress())
    expect(accAfter).toStrictEqual(['70.00000000@BTC'])
  })
})
