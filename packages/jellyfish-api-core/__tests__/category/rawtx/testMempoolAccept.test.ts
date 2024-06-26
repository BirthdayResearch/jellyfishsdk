import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { CreateRawTxOut, TestMempoolAcceptResult } from '../../../src/category/rawtx'
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

  async function testMempoolAcceptFees (fees?: BigNumber): Promise<TestMempoolAcceptResult> {
    const { txid, vout } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: vout }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('9.5')

    const unsigned = await client.rawtx.createRawTransaction(inputs, outputs)
    const signed = await client.rawtx.signRawTransactionWithKey(unsigned, [input.privKey])
    // 32 + 68 + 10 = 110 bytes
    // 1000/100 * 0.5 = 4.54545
    return await client.rawtx.testMempoolAccept(signed.hex, fees)
  }

  it('testMempoolAccept() should fail with random hex', async () => {
    const invalid = 'bf94838ced5a8313eb355c3bdd053cdbdbb3f9e0'
    return await expect(client.rawtx.testMempoolAccept(invalid))
      .rejects.toThrow('RpcApiError: \'TX decode failed\', code: -22')
  })

  it('testMempoolAccept() should fail due to missing-inputs', async () => {
    const signed = '0400000000010193c90783761bf94838ced5a8313eb355c3bdd053cdbdbb3f9e0f3dbc3243609b0000000000ffffffff020065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340080ce341d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a82000247304402201142c461b7b52323654710b14074928dd8e623d75141f9eb8c2132b7cb2d47c202202883fde993e1ecf0cf3955235522e9fe948b523b568d0e6b427f83c6f1b3efd9012103987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe8100000000'
    const result = await client.rawtx.testMempoolAccept(signed)

    expect(result.txid).toStrictEqual('5749ad89256b50786a02d4527621a4fc7fa6acc5a3b289841112628ff3a4990a')
    expect(result.allowed).toStrictEqual(false)
    expect(result['reject-reason']).toStrictEqual('missing-inputs')
  })

  it('testMempoolAccept() should succeed with any fees', async () => {
    const result = await testMempoolAcceptFees()
    expect(result.allowed).toStrictEqual(true)
  })

  it('testMempoolAccept() should succeed with high fees rate', async () => {
    const result = await testMempoolAcceptFees(new BigNumber('10.0'))
    expect(result.allowed).toStrictEqual(true)
  })

  it('testMempoolAccept() should succeed just above expected fees', async () => {
    const result = await testMempoolAcceptFees(new BigNumber('4.6'))
    expect(result.allowed).toStrictEqual(true)
  })

  it('testMempoolAccept() should fail with low fee rate', async () => {
    const result = await testMempoolAcceptFees(new BigNumber('4.5'))
    expect(result.allowed).toStrictEqual(false)
    expect(result['reject-reason']).toStrictEqual('absurdly-high-fee')
  })

  it('testMempoolAccept() should fail with extreme low fee rate', async () => {
    const result = await testMempoolAcceptFees(new BigNumber('0.01'))
    expect(result.allowed).toStrictEqual(false)
    expect(result['reject-reason']).toStrictEqual('absurdly-high-fee')
  })
})
