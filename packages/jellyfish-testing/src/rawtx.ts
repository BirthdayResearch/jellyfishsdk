import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Bech32, Elliptic, EllipticPair, HRP, WIF } from '@defichain/jellyfish-crypto'
import { RegTest } from '@defichain/jellyfish-network'

export class TestingRawTx {
  constructor (
    private readonly container: MasterNodeRegTestContainer,
    private readonly jsonRpc: JsonRpcClient
  ) {
  }

  async fund (options: TestingRawTxFund): Promise<TestingRawTxFunded> {
    const amountB = new BigNumber(options.b.amount)
    const ellipticPairB = options.b.ellipticPair ?? Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const addressB = Bech32.fromPubKey(await ellipticPairB.publicKey(), RegTest.bech32.hrp as HRP)

    const amountA = new BigNumber(options.a?.amount ?? amountB.plus(0.0001).toString())
    const ellipticPairA = options.a?.ellipticPair ?? Elliptic.fromPrivKey(Buffer.alloc(32, Math.random().toString(), 'ascii'))
    const addressA = Bech32.fromPubKey(await ellipticPairA.publicKey(), RegTest.bech32.hrp as HRP)

    const { txid, vout } = await this.container.fundAddress(addressA, amountA.toNumber())
    const inputs = [{ txid: txid, vout: vout }]

    const unsigned = await this.jsonRpc.rawtx.createRawTransaction(inputs, { [addressB]: new BigNumber(amountB) })
    const signed = await this.sign({ hex: unsigned, privKeys: [ellipticPairA] })

    return {
      a: { address: addressA, amount: amountA, ellipticPair: ellipticPairA },
      b: { address: addressB, amount: amountB, ellipticPair: ellipticPairB },
      hex: { signed, unsigned }
    }
  }

  async sign (options: TestingRawTxSign): Promise<string> {
    const { hex, privKeys } = options

    const mapped = await asPrivKey(privKeys)
    const signed = await this.jsonRpc.rawtx.signRawTransactionWithKey(hex, mapped)
    return signed.hex
  }

  /**
   * @param {string} txid to of a DfTx
   */
  async getDfTx (txid: string): Promise<TestingRawTxDfTx> {
    const transaction = await this.jsonRpc.rawtx.getRawTransaction(txid, true)
    for (const vout of transaction.vout) {
      if (vout.scriptPubKey.asm.startsWith('OP_RETURN 44665478')) {
        return {
          asm: vout.scriptPubKey.asm,
          hex: vout.scriptPubKey.hex,
          vout: { n: vout.n, value: vout.value }
        }
      }
    }

    throw new Error('dftx not found')
  }
}

async function asPrivKey (data: string[] | string | EllipticPair | EllipticPair[]): Promise<string[]> {
  if (typeof data === 'string') {
    return [data]
  }
  if ((data as EllipticPair).privateKey !== undefined) {
    return [WIF.encode(RegTest.wifPrefix, await (data as EllipticPair).privateKey())]
  }

  if (Array.isArray(data)) {
    const mapped: string[] = []
    for (const datum of data) {
      mapped.push(...await asPrivKey(datum))
    }
    return mapped
  }

  throw new Error('privKey not valid')
}

interface TestingRawTxFund {
  a?: {
    amount: number | string
    ellipticPair?: EllipticPair
  }
  b: {
    amount: number | string
    ellipticPair?: EllipticPair
  }
}

interface TestingRawTxFunded {
  a: {
    amount: BigNumber
    address: string
    ellipticPair: EllipticPair
  }
  b: {
    amount: BigNumber
    address: string
    ellipticPair: EllipticPair
  }
  hex: {
    signed: string
    unsigned: string
  }
}

interface TestingRawTxSign {
  hex: string
  privKeys: string[] | string | EllipticPair | EllipticPair[]
}

interface TestingRawTxDfTx {
  asm: string
  hex: string
  vout: {
    n: number
    value: BigNumber
  }
}
