import { SmartBuffer } from 'smart-buffer'
import { CTransaction, CTransactionSegWit } from '../../../src'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getNetworkBitcoinJsLib } from '@defichain/jellyfish-network'
import { WIF, Elliptic } from '@defichain/jellyfish-crypto'
import { getECPair, BitcoinJsLib } from '@defichain/bitcoinjs'

const unsigned = '0200000001e28bf7657f36b80bcfc7854a25ff0b2e0adbaffb95870b8387a637fd1e26d0970000000000ffffffff02804a5d05000000001600144ab4391ce5a732e36139e72d79a28e01b7b080348085b50d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a8200000000'
const signed = '02000000000101e28bf7657f36b80bcfc7854a25ff0b2e0adbaffb95870b8387a637fd1e26d0970000000000ffffffff02804a5d05000000001600144ab4391ce5a732e36139e72d79a28e01b7b080348085b50d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a820247304402203649fd61d1dd402969bdc8c74c704ab7ea3951916744901b764809f208da0c7b022030db92126984acda41dc8379c100e4e997e6f6face2b16b486037dd8cc662c31012103c1f7238aa1d97af163018b76afc000f378698da9537cf6ad7dc902643a3dd5d100000000'

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

describe('e2e', () => { // submit to testcontainer
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

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

    const { address, output } = BitcoinJsLib.getP2WPKH(pubKey, RegTest)
    expect(address).toStrictEqual(keySet.bech32)

    const keyPair = getECPair(privKey, {
      network: RegTest
    })

    const psbt = BitcoinJsLib.psbt(RegTest)
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
        value: 4_99900000 // in satoshi
      })
      .addOutput({
        script: output!,
        value: 4_99900000 // in satoshi
      })
      .signInput(0, keyPair)

    psbt.finalizeAllInputs()

    const signed = psbt.extractTransaction().toHex()
    const txid1 = await testing.rpc.rawtx.sendRawTransaction(signed)
    const tx = await container.call('getrawtransaction', [txid1, true])

    const buffer = SmartBuffer.fromBuffer(Buffer.from(tx.hex, 'hex'))
    const transaction = new CTransactionSegWit(buffer)
    expect(transaction.version).toStrictEqual(2)
  })
})
