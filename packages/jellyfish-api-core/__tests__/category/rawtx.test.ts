import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import { BigNumber } from '../../src'
import { CreateRawTxOut, SigHashType, SignRawTxWithKeyResult, TestMempoolAcceptResult } from '../../src/category/rawtx'

const container = new MasterNodeRegTestContainer()
const client = new ContainerAdapterClient(container)

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(300)
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

describe('createRawTransaction', () => {
  it('should createRawTransaction()', async () => {
    const { txid } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: 0 }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')

    const unsigned: string = await client.rawtx.createRawTransaction(inputs, outputs)

    // Version
    expect(unsigned.substr(0, 8)).toBe('04000000')
    // Vin
    expect(unsigned.substr(8, 2)).toBe('01')
    expect(unsigned.substr(10, 64)).toBe(
      Buffer.from(txid, 'hex').reverse().toString('hex')
    )
    expect(unsigned.substr(74, 8)).toBe('00000000')
    expect(unsigned.substr(82, 2)).toBe('00')
    expect(unsigned.substr(84, 8)).toBe('ffffffff')
    // Vout
    expect(unsigned.substr(92, 2)).toBe('01')
    expect(unsigned.substr(94, 16)).toBe('0065cd1d00000000')
    expect(unsigned.substr(110, 2)).toBe('16')
    expect(unsigned.substr(112, 2)).toBe('00') // OP_0
    expect(unsigned.substr(114, 2)).toBe('14')
    expect(unsigned.substr(116, 40)).toBe('4ab4391ce5a732e36139e72d79a28e01b7b08034') // PKH
    expect(unsigned.substr(156, 2)).toBe('00') // DCT_ID
    // LockTime
    expect(unsigned.substr(158, 8)).toBe('00000000')

    expect(unsigned.length).toBe(166)
  })

  it('should createRawTransaction() with locktime 1000', async () => {
    const { txid } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: 0 }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')

    const unsigned: string = await client.rawtx.createRawTransaction(inputs, outputs, {
      locktime: 1000
    })

    expect(unsigned.substr(0, 84)).toBe(
      '0400000001' + Buffer.from(txid, 'hex').reverse().toString('hex') + '0000000000'
    )
    expect(unsigned.substr(84, 8)).toBe('feffffff')
    expect(unsigned.substr(92, 66)).toBe('010065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b0803400')
    expect(unsigned.substr(158, 8)).toBe('e8030000')
    expect(unsigned.length).toBe(166)
  })

  it('should createRawTransaction() with replaceable = true', async () => {
    const { txid } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: 0 }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')

    const unsigned: string = await client.rawtx.createRawTransaction(inputs, outputs, {
      replaceable: true
    })

    expect(unsigned.substr(0, 84)).toBe(
      '0400000001' + Buffer.from(txid, 'hex').reverse().toString('hex') + '0000000000'
    )
    expect(unsigned.substr(84, 8)).toBe('fdffffff')
    expect(unsigned.substr(92, 74)).toBe('010065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340000000000')
    expect(unsigned.length).toBe(166)
  })
})

describe('signRawTransactionWithKey', () => {
  it('should signRawTransactionWithKey() 10.0 to 5.0 with 5.0 as fee', async () => {
    const { txid, vout } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: vout }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')

    const unsigned = await client.rawtx.createRawTransaction(inputs, outputs)
    const signed = await client.rawtx.signRawTransactionWithKey(unsigned, [input.privKey])

    expect(signed.complete).toBe(true)
    expect(signed.hex.substr(0, 14)).toBe('04000000000101')
    expect(signed.hex.substr(86, 82)).toBe('00ffffffff010065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b0803400024730')
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

    expect(signed.complete).toBe(true)
    expect(signed.hex.substr(0, 14)).toBe('04000000000101')
    expect(signed.hex.substr(86, 146)).toBe('00ffffffff020065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340080ce341d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a8200024730')
    expect(signed.hex).toContain('012103987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe8100000000')
  })

  describe('signRawTransactionWithKeySigHashType', () => {
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
      expect(signed.complete).toBe(true)
      expect(signed.hex.length).toBeGreaterThanOrEqual(446)
      expect(signed.hex.length).toBeLessThanOrEqual(448)
    }

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
})

describe('testMempoolAccept', () => {
  it('testMempoolAccept() should fail with random hex', async () => {
    const invalid = 'bf94838ced5a8313eb355c3bdd053cdbdbb3f9e0'
    return await expect(client.rawtx.testMempoolAccept(invalid))
      .rejects.toThrow('RpcApiError: \'TX decode failed\', code: -22')
  })

  it('testMempoolAccept() should fail due to missing-inputs', async () => {
    const signed = '0400000000010193c90783761bf94838ced5a8313eb355c3bdd053cdbdbb3f9e0f3dbc3243609b0000000000ffffffff020065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340080ce341d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a82000247304402201142c461b7b52323654710b14074928dd8e623d75141f9eb8c2132b7cb2d47c202202883fde993e1ecf0cf3955235522e9fe948b523b568d0e6b427f83c6f1b3efd9012103987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe8100000000'
    const result = await client.rawtx.testMempoolAccept(signed)

    expect(result.txid).toBe('5749ad89256b50786a02d4527621a4fc7fa6acc5a3b289841112628ff3a4990a')
    expect(result.allowed).toBe(false)
    expect(result['reject-reason']).toBe('missing-inputs')
  })

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

  it('testMempoolAccept() should succeed with any fees', async () => {
    const result = await testMempoolAcceptFees()
    expect(result.allowed).toBe(true)
  })

  it('testMempoolAccept() should succeed with high fees rate', async () => {
    const result = await testMempoolAcceptFees(new BigNumber('10.0'))
    expect(result.allowed).toBe(true)
  })

  it('testMempoolAccept() should succeed just above expected fees', async () => {
    const result = await testMempoolAcceptFees(new BigNumber('4.6'))
    expect(result.allowed).toBe(true)
  })

  it('testMempoolAccept() should fail with low fee rate', async () => {
    const result = await testMempoolAcceptFees(new BigNumber('4.5'))
    expect(result.allowed).toBe(false)
    expect(result['reject-reason']).toBe('256: absurdly-high-fee')
  })

  it('testMempoolAccept() should fail with extreme low fee rate', async () => {
    const result = await testMempoolAcceptFees(new BigNumber('0.01'))
    expect(result.allowed).toBe(false)
    expect(result['reject-reason']).toBe('256: absurdly-high-fee')
  })
})

describe('sendRawTransaction', () => {
  it('should sendRawTransaction() and get rawtx and wait confirmations', async () => {
    const inputs = [
      await container.fundAddress(input.bech32, 10)
    ]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('9.9')

    const unsigned = await client.rawtx.createRawTransaction(inputs, outputs)
    const signed = await client.rawtx.signRawTransactionWithKey(unsigned, [input.privKey])
    const txid = await client.rawtx.sendRawTransaction(signed.hex)

    const tx = await container.call('getrawtransaction', [txid, true])
    expect(tx.txid).toBe(txid)
  })
})
