import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber } from '../../../src'

describe('TxOut', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getTxOut', async () => {
    const txId = '00eed320c213f506038fa29f77d4d2535232fa97b7789ff6fb516c63201c5e44'
    const txOut = await client.blockchain.getTxOut(txId, 0)
    expect(txOut).toHaveProperty('bestblock')
    expect(txOut.confirmations).toBeGreaterThanOrEqual(1)
    expect(txOut.value instanceof BigNumber).toStrictEqual(true)
    expect(txOut.value.toString()).toStrictEqual('38')
    expect(txOut.scriptPubKey).toHaveProperty('asm')
    expect(txOut.scriptPubKey).toHaveProperty('hex')
    expect(txOut.scriptPubKey.reqSigs).toBeGreaterThanOrEqual(1)
    expect(txOut.scriptPubKey.type).toStrictEqual('pubkeyhash')
    expect(txOut.scriptPubKey.addresses.length).toBeGreaterThanOrEqual(1)
    expect(txOut.scriptPubKey.addresses[0]).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    expect(txOut.coinbase).toStrictEqual(true)
  })
})
