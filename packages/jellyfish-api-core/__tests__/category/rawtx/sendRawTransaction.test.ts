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
    expect(tx.txid).toStrictEqual(txid)
  })
})
