import BigNumber from 'bignumber.js'
import { Bech32, EllipticPair, Eth, HASH160, WIF } from '@defichain/jellyfish-crypto'
import { EllipticPairProvider, FeeRateProvider, ListUnspentQueryOptions, Prevout, PrevoutProvider } from '../src'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { randomEllipticPair } from './test.utils'

export class MockFeeRateProvider implements FeeRateProvider {
  constructor (
    public readonly container: MasterNodeRegTestContainer
  ) {
  }

  async estimate (): Promise<BigNumber> {
    const result = await this.container.call('estimatesmartfee', [1])
    if (result.errors !== undefined && result.errors.length > 0) {
      return new BigNumber('0.00005000')
    }
    return new BigNumber(result.feerate)
  }
}

export class MockPrevoutProvider implements PrevoutProvider {
  constructor (
    public readonly container: MasterNodeRegTestContainer,
    public ellipticPair: EllipticPair
  ) {
  }

  async all (): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    const unspent: any[] = await this.container.call('listunspent', [
      1, 9999999, [Bech32.fromPubKey(pubKey, 'bcrt')]
    ])

    return unspent.map((utxo: any): Prevout => {
      return MockPrevoutProvider.mapPrevout(utxo, pubKey)
    })
  }

  async collect (minBalance: BigNumber, options?: ListUnspentQueryOptions): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    const address = Bech32.fromPubKey(pubKey, 'bcrt')

    // TODO(fuxingloh): minimumSumAmount behavior is weirdly inconsistent, listunspent will always
    //  return the correct result without providing options. However, with 'minimumSumAmount', it
    //  will appear sometimes. Likely due to race conditions in bitcoin code,
    //  e.g. -reindex when importprivkey.
    const unspent: any[] = await this.container.call('listunspent', [
      1, 9999999, [address], true, options
    ])

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

export async function getProviders (container: MasterNodeRegTestContainer): Promise<MockProviders> {
  return new MockProviders(container)
}

export class MockProviders {
  fee: MockFeeRateProvider
  prevout: MockPrevoutProvider
  elliptic: MockEllipticPairProvider
  ellipticPair: EllipticPair = randomEllipticPair()

  constructor (readonly container: MasterNodeRegTestContainer) {
    this.fee = new MockFeeRateProvider(container)
    this.elliptic = new MockEllipticPairProvider(this.ellipticPair)
    this.prevout = new MockPrevoutProvider(container, this.ellipticPair)
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

    // TODO(canonbrother): try..catch to skip the err to allow import raw privkey again to support evm addr
    // due to wif was imported beforehand
    // https://github.com/BirthdayResearch/jellyfishsdk/blob/60ebb395ce78ca8d395ede56f90e46c18c0da935/packages/testcontainers/src/containers/RegTestContainer/Masternode.ts#L59-L60
    // remove once auto import is done
    try {
      evm
        ? await this.container.call('importprivkey', [privKey.toString('hex')])
        : await this.container.call('importprivkey', [WIF.encode(0xef, privKey)])
    } catch (err) {
      console.log('err: ', err)
    }
  }
}
