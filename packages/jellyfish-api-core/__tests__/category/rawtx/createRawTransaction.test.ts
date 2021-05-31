import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { CreateRawTxOut } from '../../../src/category/rawtx'
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

  it('should createRawTransaction()', async () => {
    const { txid } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: 0 }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')

    const unsigned: string = await client.rawtx.createRawTransaction(inputs, outputs)

    // Version
    expect(unsigned.substr(0, 8)).toStrictEqual('04000000')
    // Vin
    expect(unsigned.substr(8, 2)).toStrictEqual('01')
    expect(unsigned.substr(10, 64)).toStrictEqual(
      Buffer.from(txid, 'hex').reverse().toString('hex')
    )
    expect(unsigned.substr(74, 8)).toStrictEqual('00000000')
    expect(unsigned.substr(82, 2)).toStrictEqual('00')
    expect(unsigned.substr(84, 8)).toStrictEqual('ffffffff')
    // Vout
    expect(unsigned.substr(92, 2)).toStrictEqual('01')
    expect(unsigned.substr(94, 16)).toStrictEqual('0065cd1d00000000')
    expect(unsigned.substr(110, 2)).toStrictEqual('16')
    expect(unsigned.substr(112, 2)).toStrictEqual('00') // OP_0
    expect(unsigned.substr(114, 2)).toStrictEqual('14')
    expect(unsigned.substr(116, 40)).toStrictEqual('4ab4391ce5a732e36139e72d79a28e01b7b08034') // PKH
    expect(unsigned.substr(156, 2)).toStrictEqual('00') // DCT_ID
    // LockTime
    expect(unsigned.substr(158, 8)).toStrictEqual('00000000')

    expect(unsigned.length).toStrictEqual(166)
  })

  it('should createRawTransaction() with locktime 1000', async () => {
    const { txid } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: 0 }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')

    const unsigned: string = await client.rawtx.createRawTransaction(inputs, outputs, {
      locktime: 1000
    })

    expect(unsigned.substr(0, 84)).toStrictEqual(
      '0400000001' + Buffer.from(txid, 'hex').reverse().toString('hex') + '0000000000'
    )
    expect(unsigned.substr(84, 8)).toStrictEqual('feffffff')
    expect(unsigned.substr(92, 66)).toStrictEqual('010065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b0803400')
    expect(unsigned.substr(158, 8)).toStrictEqual('e8030000')
    expect(unsigned.length).toStrictEqual(166)
  })

  it('should createRawTransaction() with replaceable = true', async () => {
    const { txid } = await container.fundAddress(input.bech32, 10)
    const inputs = [{ txid: txid, vout: 0 }]

    const outputs: CreateRawTxOut = {}
    outputs[output.bech32] = new BigNumber('5')

    const unsigned: string = await client.rawtx.createRawTransaction(inputs, outputs, {
      replaceable: true
    })

    expect(unsigned.substr(0, 84)).toStrictEqual(
      '0400000001' + Buffer.from(txid, 'hex').reverse().toString('hex') + '0000000000'
    )
    expect(unsigned.substr(84, 8)).toStrictEqual('fdffffff')
    expect(unsigned.substr(92, 74)).toStrictEqual('010065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340000000000')
    expect(unsigned.length).toStrictEqual(166)
  })
})
