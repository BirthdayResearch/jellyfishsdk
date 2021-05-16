import { BigNumber } from 'bignumber.js'
import { Bech32, Elliptic, EllipticPair, HASH160 } from '@defichain/jellyfish-crypto'
import { EllipticPairProvider, FeeRateProvider, Prevout, PrevoutProvider } from '../src'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'

export class MockFeeRateProvider implements FeeRateProvider {
  constructor (readonly container: MasterNodeRegTestContainer) {
  }

  async estimate (): Promise<BigNumber> {
    const { feerate } = await this.container.call('estimatesmartfee')
    return new BigNumber(feerate)
  }
}

export class MockPrevoutProvider implements PrevoutProvider {
  constructor (
    readonly container: MasterNodeRegTestContainer,
    readonly ellipticPair: EllipticPair
  ) {
  }

  async all (): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    const unspent: any[] = await this.container.call('listunspent', [
      0, 9999999, [Bech32.fromPubKey(pubKey, 'bcrt')]
    ])

    return unspent.map((utxo: any): Prevout => {
      return MockPrevoutProvider.mapPrevout(utxo, pubKey)
    })
  }

  async collect (minBalance: BigNumber): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    const unspent: any[] = await this.container.call('listunspent', [
      0, 9999999, [Bech32.fromPubKey(pubKey, 'bcrt'), false, {
        minimumSumAmount: minBalance.toNumber()
      }]
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
    readonly ellipticPair: EllipticPair
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

export function getProviders (container: MasterNodeRegTestContainer): Providers {
  const ellipticPair = randomEllipticPair()
  return {
    fee: new MockFeeRateProvider(container),
    elliptic: new MockEllipticPairProvider(ellipticPair),
    prevout: new MockPrevoutProvider(container, ellipticPair)
  }
}

export async function fundEllipticPair (container: MasterNodeRegTestContainer, ellipticPair: EllipticPair, amount: number): Promise<void> {
  const pubKey = await ellipticPair.publicKey()
  const address = Bech32.fromPubKey(pubKey, 'bcrt')
  await container.fundAddress(address, amount)
}

export function randomEllipticPair (): EllipticPair {
  return Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
}

interface Providers {
  fee: MockFeeRateProvider
  prevout: MockPrevoutProvider
  elliptic: MockEllipticPairProvider
}
