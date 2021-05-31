import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { CreateRawTxOut, SigHashType, SignRawTxWithKeyResult } from '../../../src/category/rawtx'
import BigNumber from 'bignumber.js'

describe('Raw transaction', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function signRawTransactionWithKeySigHashType (type: SigHashType): Promise<SignRawTxWithKeyResult> {
    const inputs = [
      await container.fundAddress(input.bech32, 10)
    ]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')
    outputs[input.bech32] = new BigNumber('4.9')

    const unsigned = await client.rawtx.createRawTransaction(inputs, outputs)
    return await client.rawtx.signRawTransactionWithKey(unsigned, [input.privKey], {
      sigHashType: type
    })
  }

  function exceptSignature (signed: SignRawTxWithKeyResult): void {
    expect(signed.complete).toStrictEqual(true)
    expect(signed.hex.length).toBeGreaterThanOrEqual(446)
    expect(signed.hex.length).toBeLessThanOrEqual(448)
  }

  // From Address P2WPKH
  const input = {
    bech32: 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn',
    privKey: 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
  }

  // To Address P2WPKH
  const output = {
    bech32: 'bcrt1qf26rj8895uewxcfeuukhng5wqxmmpqp555z5a7',
    privKey: 'cQbfHFbdJNhg3UGaBczir2m5D4hiFRVRKgoU8GJoxmu2gEhzqHtV'
  }

  it('should signRawTransactionWithKey() 10.0 to 5.0 with 5.0 as fee', async () => {
    const { txid, vout } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: vout }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')

    const unsigned = await client.rawtx.createRawTransaction(inputs, outputs)
    const signed = await client.rawtx.signRawTransactionWithKey(unsigned, [input.privKey])

    expect(signed.complete).toStrictEqual(true)
    expect(signed.hex.substr(0, 14)).toStrictEqual('04000000000101')
    expect(signed.hex.substr(86, 78)).toStrictEqual('00ffffffff010065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340002')
    expect(signed.hex).toContain('012103987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe8100000000')
  })

  // TODO(anyone): SignRawTxWithKeyPrevTx is not yet typed tested,
  //  for sake of time. It's out of my scope of work.

  it('should signRawTransactionWithKey() 10.0 to 5.0 with 4.9 as change and 0.1 as fee', async () => {
    const { txid, vout } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: vout }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')
    outputs[input.bech32] = new BigNumber('4.9')

    const unsigned = await client.rawtx.createRawTransaction(inputs, outputs)
    const signed = await client.rawtx.signRawTransactionWithKey(unsigned, [input.privKey])

    expect(signed.complete).toStrictEqual(true)
    expect(signed.hex.substr(0, 14)).toStrictEqual('04000000000101')
    expect(signed.hex.substr(86, 142)).toStrictEqual('00ffffffff020065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340080ce341d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a820002')
    expect(signed.hex).toContain('012103987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe8100000000')
  })

  it('should signRawTransactionWithKey() with SigHashType.ALL', async () => {
    const signed = await signRawTransactionWithKeySigHashType(SigHashType.ALL)
    exceptSignature(signed)
  })

  it('should signRawTransactionWithKey() with SigHashType.NONE', async () => {
    const signed = await signRawTransactionWithKeySigHashType(SigHashType.NONE)
    exceptSignature(signed)
  })

  it('should signRawTransactionWithKey() with SigHashType.SINGLE', async () => {
    const signed = await signRawTransactionWithKeySigHashType(SigHashType.SINGLE)
    exceptSignature(signed)
  })

  it('should signRawTransactionWithKey() with SigHashType.ALL_ANYONECANPAY', async () => {
    const signed = await signRawTransactionWithKeySigHashType(SigHashType.ALL_ANYONECANPAY)
    exceptSignature(signed)
  })

  it('should signRawTransactionWithKey() with SigHashType.NONE_ANYONECANPAY', async () => {
    const signed = await signRawTransactionWithKeySigHashType(SigHashType.NONE_ANYONECANPAY)
    exceptSignature(signed)
  })

  it('should signRawTransactionWithKey() with SigHashType.SINGLE_ANYONECANPAY', async () => {
    const signed = await signRawTransactionWithKeySigHashType(SigHashType.SINGLE_ANYONECANPAY)
    exceptSignature(signed)
  })
})
