import BigNumber from 'bignumber.js'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { EllipticPairProvider, FeeRateProvider, Prevout, PrevoutProvider } from '@defichain/jellyfish-transaction-builder'
import { Bech32, Elliptic, EllipticPair, HASH160, WIF } from '@defichain/jellyfish-crypto'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'

export class CoinbaseFeeRateProvider implements FeeRateProvider {
  constructor (
    public readonly apiClient: ApiClient
  ) {
  }

  async estimate (): Promise<BigNumber> {
    const result = await this.apiClient.mining.estimateSmartFee(1)
    if (result.feerate === undefined || (result.errors !== undefined && result.errors.length > 0)) {
      return new BigNumber('0.00005000')
    }
    return new BigNumber(result.feerate)
  }
}

export class CoinbasePrevoutProvider implements PrevoutProvider {
  constructor (
    public readonly apiClient: ApiClient,
    public ellipticPair: EllipticPair
  ) {
  }

  async collect (minBalance: BigNumber): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    const address = Bech32.fromPubKey(pubKey, 'bcrt')

    const unspent: any[] = await this.apiClient.wallet.listUnspent(
      1, 9999999, { addresses: [address] }
    )

    return unspent.map((utxo: any): Prevout => {
      return CoinbasePrevoutProvider.mapPrevout(utxo, pubKey)
    })
  }

  async all (): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    const unspent: any[] = await this.apiClient.wallet.listUnspent(
      1, 9999999, {
        addresses: [Bech32.fromPubKey(pubKey, 'bcrt')]
      })

    return unspent.map((utxo: any): Prevout => {
      return CoinbasePrevoutProvider.mapPrevout(utxo, pubKey)
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

export class CoinbaseEllipticPairProvider implements EllipticPairProvider {
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

  get (prevout: Prevout): EllipticPair {
    return this.ellipticPair
  }
}

export class CoinbaseProviders {
  PRIV_KEY = RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.privKey
  fee: CoinbaseFeeRateProvider
  prevout: CoinbasePrevoutProvider
  elliptic: CoinbaseEllipticPairProvider
  ellipticPair: EllipticPair = Elliptic.fromPrivKey(WIF.decode(this.PRIV_KEY).privateKey)

  constructor (readonly apiClient: ApiClient) {
    this.fee = new CoinbaseFeeRateProvider(apiClient)
    this.elliptic = new CoinbaseEllipticPairProvider(this.ellipticPair)
    this.prevout = new CoinbasePrevoutProvider(apiClient, this.ellipticPair)
  }

  setEllipticPair (ellipticPair: EllipticPair): void {
    this.ellipticPair = ellipticPair
    this.elliptic.ellipticPair = this.ellipticPair
    this.prevout.ellipticPair = this.ellipticPair
  }

  async getAddress (): Promise<string> {
    const pubKey = await this.ellipticPair.publicKey()
    return Bech32.fromPubKey(pubKey, 'bcrt', 0x00)
  }
}
