import BigNumber from 'bignumber.js'
import { Bech32, EllipticPair, Eth, HASH160, WIF } from '@defichain/jellyfish-crypto'
import { EllipticPairProvider, FeeRateProvider, ListUnspentQueryOptions, Prevout, PrevoutProvider } from '../src'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { randomEllipticPair } from './test.utils'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

export class MockFeeRateProvider implements FeeRateProvider {
  constructor (
    public readonly context: MasterNodeRegTestContainer | JsonRpcClient
  ) {
  }

  async estimate (): Promise<BigNumber> {
    let result
    if (this.context instanceof MasterNodeRegTestContainer) {
      result = await this.context.call('estimatesmartfee', [1])
    } else {
      result = await this.context.call('estimatesmartfee', [1], 'number')
    }
    if (result.errors !== undefined && result.errors.length > 0) {
      return new BigNumber('0.00005000')
    }
    return new BigNumber(result.feerate)
  }
}

export class MockPrevoutProvider implements PrevoutProvider {
  constructor (
    public readonly context: MasterNodeRegTestContainer | JsonRpcClient,
    public ellipticPair: EllipticPair
  ) {
  }

  async all (): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    let unspent: any[]
    if (this.context instanceof MasterNodeRegTestContainer) {
      unspent = await this.context.call('listunspent', [
        1, 9999999, [Bech32.fromPubKey(pubKey, 'bcrt')]
      ])
    } else {
      unspent = await this.context.call('listunspent', [
        1, 9999999, [Bech32.fromPubKey(pubKey, 'bcrt')]
      ], 'number')
    }

    return unspent.map((utxo: any): Prevout => {
      return MockPrevoutProvider.mapPrevout(utxo, pubKey)
    })
  }

  async collect (minBalance: BigNumber, options?: ListUnspentQueryOptions): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    const address = Bech32.fromPubKey(pubKey, 'bcrt')
    console.log('collect address: ', address)

    // TODO(fuxingloh): minimumSumAmount behavior is weirdly inconsistent, listunspent will always
    //  return the correct result without providing options. However, with 'minimumSumAmount', it
    //  will appear sometimes. Likely due to race conditions in bitcoin code,
    //  e.g. -reindex when importprivkey.
    let unspent: any[]
    if (this.context instanceof MasterNodeRegTestContainer) {
      unspent = await this.context.call('listunspent', [
        1, 9999999, [address], true, options
      ])
    } else {
      console.log('collect client')
      unspent = await this.context.call('listunspent', [
        1, 9999999, [address], true, options
      ], 'number')
    }
    console.log('unspent: ', unspent)

    return unspent.map((utxo: any): Prevout => {
      return MockPrevoutProvider.mapPrevout(utxo, pubKey)
    })
  }

  static mapPrevout (utxo: any, pubKey: Buffer): Prevout {
    return {
      txid: utxo.txid,
      vout: utxo.vout,
      value: new BigNumber(utxo.amount),
      script: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA(HASH160(pubKey), 'little')
        ]
      },
      tokenId: utxo.tokenId
    }
  }
}

export class MockEllipticPairProvider implements EllipticPairProvider {
  constructor (
    public ellipticPair: EllipticPair
  ) {
  }

  async script (): Promise<Script> {
    return {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(await this.ellipticPair.publicKey()), 'little')
      ]
    }
  }

  async evmScript (): Promise<Script> {
    const pubKeyUncompressed = await this.ellipticPair.publicKeyUncompressed()
    return {
      stack: [
        OP_CODES.OP_16,
        OP_CODES.OP_PUSHDATA_HEX_BE(Eth.fromPubKeyUncompressed(pubKeyUncompressed).substring(2))
      ]
    }
  }

  get (prevout: Prevout): EllipticPair {
    return this.ellipticPair
  }
}

export async function getProviders (context: MasterNodeRegTestContainer | JsonRpcClient): Promise<MockProviders> {
  return new MockProviders(context)
}

export class MockProviders {
  fee: MockFeeRateProvider
  prevout: MockPrevoutProvider
  elliptic: MockEllipticPairProvider
  ellipticPair: EllipticPair = randomEllipticPair()

  constructor (readonly context: MasterNodeRegTestContainer | JsonRpcClient) {
    this.fee = new MockFeeRateProvider(context)
    this.elliptic = new MockEllipticPairProvider(this.ellipticPair)
    this.prevout = new MockPrevoutProvider(context, this.ellipticPair)
  }

  /**
   * As MockProvider is linked to a full node you need to reset everytime you want to fund
   * a new transaction.
   */
  randomizeEllipticPair (): void {
    this.ellipticPair = randomEllipticPair()
    this.elliptic.ellipticPair = this.ellipticPair
    this.prevout.ellipticPair = this.ellipticPair
  }

  /**
   * Sets a new elliptic pair on the provider
   */
  setEllipticPair (ellipticPair: EllipticPair): void {
    this.ellipticPair = ellipticPair
    this.elliptic.ellipticPair = this.ellipticPair
    this.prevout.ellipticPair = this.ellipticPair
  }

  async getAddress (): Promise<string> {
    const pubKey = await this.ellipticPair.publicKey()
    return Bech32.fromPubKey(pubKey, 'bcrt', 0x00)
  }

  async getEvmAddress (): Promise<string> {
    const pubKeyUncompressed = await this.ellipticPair.publicKeyUncompressed()
    return Eth.fromPubKeyUncompressed(pubKeyUncompressed)
  }

  async setupMocks (evm = false): Promise<void> {
    // full nodes need importprivkey or else it can't list unspent
    const privKey = await this.ellipticPair.privateKey()
    evm
      ? await this.context.call('importprivkey', [privKey.toString('hex')], 'number')
      : await this.context.call('importprivkey', [WIF.encode(0xef, privKey)], 'number')
  }
}
