import { SmartBuffer } from 'smart-buffer'
import { CTransaction, CTransactionSegWit } from '../../../src'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getNetworkBitcoinJsLib } from '@defichain/jellyfish-network'
import { WIF, Elliptic } from '@defichain/jellyfish-crypto'
import * as bitcoin from 'bitcoinjs-lib'
import { ECPairAPI, ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'

const unsigned = '0200000001f846da136c83e76c8538caa35346c7836ab603b017b564e35f17d7dfdc57066e0000000000ffffffff01804a5d05000000001600144ab4391ce5a732e36139e72d79a28e01b7b0803400000000'
const signed = '02000000000101f846da136c83e76c8538caa35346c7836ab603b017b564e35f17d7dfdc57066e0000000000ffffffff01804a5d05000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340247304402206fcd6c8f1582136ad7f0d034aedd960f7aa0c1af8ba7dd982f7ab8c6c7fc75f6022066a0886d96a004381750c95a54391cf958e59143d0a1e1b622ede0f79b5ab14c012103c1f7238aa1d97af163018b76afc000f378698da9537cf6ad7dc902643a3dd5d100000000'

describe('encoding', () => {
  it('bi-directional unsigned buffer', () => {
    const fromBuffer = SmartBuffer.fromBuffer(Buffer.from(unsigned, 'hex'))
    const tx = new CTransaction(fromBuffer)

    const toBuffer = new SmartBuffer()
    tx.toBuffer(toBuffer)
    expect(toBuffer.toBuffer().toString('hex')).toStrictEqual(unsigned)
  })

  it('bi-directional signed buffer', () => {
    const fromBuffer = SmartBuffer.fromBuffer(Buffer.from(signed, 'hex'))
    const tx = new CTransactionSegWit(fromBuffer)

    const toBuffer = new SmartBuffer()
    tx.toBuffer(toBuffer)

    expect(toBuffer.toBuffer().toString('hex')).toStrictEqual(signed)
  })
})

describe('e2e submit to testcontainers', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  const ECPair: ECPairAPI = ECPairFactory(ecc)
  const RegTest = getNetworkBitcoinJsLib('regtest')
  const keySet = {
    bech32: 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn',
    wif: 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
  }

  it('should broadcast v2 transaction', async () => {
    const wifDecoded = WIF.decode(keySet.wif)
    const privKey = wifDecoded.privateKey
    const pubKey = await Elliptic.fromPrivKey(privKey).publicKey()

    await testing.rpc.wallet.importPrivKey(keySet.wif)
    expect(keySet.wif).toStrictEqual(await testing.rpc.wallet.dumpPrivKey(keySet.bech32))

    const { txid, vout } = await container.fundAddress(keySet.bech32, 10)

    const unspent = await container.call('listunspent', [
      0, 9999999, [keySet.bech32]
    ])
    expect(unspent[0].txid).toStrictEqual(txid)
    expect(unspent[0].vout).toStrictEqual(vout)
    expect(unspent[0].address).toStrictEqual(keySet.bech32)
    expect(unspent[0].amount).toStrictEqual(10)
    expect(unspent[0].spendable).toStrictEqual(true)
    expect(unspent[0].solvable).toStrictEqual(true)

    const { address, output } = bitcoin.payments.p2wpkh({
      pubkey: pubKey,
      network: RegTest
    })
    expect(address).toStrictEqual(keySet.bech32)

    const keyPair = ECPair.fromPrivateKey(privKey, {
      network: RegTest
    })

    const psbt = new bitcoin.Psbt({ network: RegTest })
      .addInput({
        hash: txid,
        index: vout,
        witnessUtxo: {
          value: 10_00000000, // in satoshi
          script: output!
        }
      })
      .addOutput({
        script: output!,
        value: 9_99999000 // in satoshi
      })
      .signInput(0, keyPair)

    psbt.finalizeAllInputs()

    const signed = psbt.extractTransaction().toHex()
    const txid1 = await testing.rpc.rawtx.sendRawTransaction(signed)
    await testing.container.generate(1)

    const tx = await container.call('getrawtransaction', [txid1, true])

    const buffer = SmartBuffer.fromBuffer(Buffer.from(tx.hex, 'hex'))
    const transaction = new CTransactionSegWit(buffer)
    expect(transaction.version).toStrictEqual(2)
  })
})
