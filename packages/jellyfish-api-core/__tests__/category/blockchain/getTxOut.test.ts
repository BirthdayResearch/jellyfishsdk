import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('TxOut', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getTxOut of regtest 100M DFI - 0', async () => {
    const txId = '9fb9c46b1d12dae8a4a35558f7ef4b047df3b444b1ead61d334e4f187f5f58b7'
    const txOut = await client.blockchain.getTxOut(txId, 0)

    expect(txOut).toHaveProperty('bestblock')
    expect(txOut.confirmations).toBeGreaterThanOrEqual(1)
    expect(txOut.value instanceof BigNumber).toStrictEqual(true)
    expect(txOut.value.toString()).toStrictEqual('100000000')
    expect(txOut.scriptPubKey).toHaveProperty('asm')
    expect(txOut.scriptPubKey).toHaveProperty('hex')
    expect(txOut.scriptPubKey.reqSigs).toBeGreaterThanOrEqual(1)
    expect(txOut.scriptPubKey.type).toStrictEqual('pubkeyhash')
    expect(txOut.scriptPubKey.addresses.length).toBeGreaterThanOrEqual(1)
    expect(txOut.scriptPubKey.addresses[0]).toStrictEqual(GenesisKeys[0].owner.address)
    expect(txOut.coinbase).toStrictEqual(true)
  })

  it('should getTxOut of regtest 100M DFI - 1', async () => {
    const txId = '9fb9c46b1d12dae8a4a35558f7ef4b047df3b444b1ead61d334e4f187f5f58b7'
    const txOut = await client.blockchain.getTxOut(txId, 1)

    expect(txOut.value.toString()).toStrictEqual('100000000')
    expect(txOut.scriptPubKey.addresses[0]).toStrictEqual(GenesisKeys[0].operator.address)
    expect(txOut.coinbase).toStrictEqual(true)
  })

  it('should getTxOut of regtest 100M DFI - 2', async () => {
    const txId = '9fb9c46b1d12dae8a4a35558f7ef4b047df3b444b1ead61d334e4f187f5f58b7'
    const txOut = await client.blockchain.getTxOut(txId, 2)

    expect(txOut.value.toString()).toStrictEqual('100000000')
    expect(txOut.scriptPubKey.addresses[0]).toStrictEqual(GenesisKeys[1].owner.address)
    expect(txOut.coinbase).toStrictEqual(true)
  })

  it('should getTxOut of regtest 100M DFI - 3', async () => {
    const txId = '9fb9c46b1d12dae8a4a35558f7ef4b047df3b444b1ead61d334e4f187f5f58b7'
    const txOut = await client.blockchain.getTxOut(txId, 3)

    expect(txOut.value.toString()).toStrictEqual('100000000')
    expect(txOut.scriptPubKey.addresses[0]).toStrictEqual(GenesisKeys[1].operator.address)
    expect(txOut.coinbase).toStrictEqual(true)
  })

  it('should getTxOut of regtest 100M DFI - 4', async () => {
    const txId = '9fb9c46b1d12dae8a4a35558f7ef4b047df3b444b1ead61d334e4f187f5f58b7'
    const txOut = await client.blockchain.getTxOut(txId, 4)

    expect(txOut.value.toString()).toStrictEqual('100')
    expect(txOut.scriptPubKey.addresses[0]).toStrictEqual(GenesisKeys[5].owner.address)
    expect(txOut.coinbase).toStrictEqual(true)
  })
})
