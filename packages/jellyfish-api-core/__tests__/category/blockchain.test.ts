import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('non masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getBlockchainInfo', async () => {
    const info = await client.blockchain.getBlockchainInfo()

    expect(info.chain).toBe('regtest')
    expect(info.blocks).toBe(0)
    expect(info.headers).toBe(0)

    expect(info.bestblockhash.length).toBe(64)
    expect(info.difficulty).toBeGreaterThan(0)
    expect(info.mediantime).toBeGreaterThan(1550000000)

    expect(info.verificationprogress).toBe(1)
    expect(info.initialblockdownload).toBe(true)
    expect(info.chainwork.length).toBe(64)
    expect(info.size_on_disk).toBeGreaterThan(0)
    expect(info.pruned).toBe(false)

    expect(info.softforks.amk.type).toBe('buried')
    expect(info.softforks.amk.active).toBe(true)
    expect(info.softforks.amk.height).toBe(0)

    expect(info.softforks.segwit.type).toBe('buried')
    expect(info.softforks.segwit.active).toBe(true)
    expect(info.softforks.segwit.height).toBe(0)
  })
})

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getBlockchainInfo', async () => {
    await waitForExpect(async () => {
      const info = await client.blockchain.getBlockchainInfo()
      await expect(info.blocks).toBeGreaterThan(1)
    })

    const info = await client.blockchain.getBlockchainInfo()

    expect(info.chain).toBe('regtest')
    expect(info.blocks).toBeGreaterThan(0)
    expect(info.headers).toBeGreaterThan(0)

    expect(info.bestblockhash.length).toBe(64)
    expect(info.difficulty).toBeGreaterThan(0)
    expect(info.mediantime).toBeGreaterThan(1550000000)

    expect(info.verificationprogress).toBe(1)
    expect(info.initialblockdownload).toBe(false)
    expect(info.chainwork.length).toBe(64)
    expect(info.size_on_disk).toBeGreaterThan(0)
    expect(info.pruned).toBe(false)
  })

  it('should getTxOut', async () => {
    const txId = '00eed320c213f506038fa29f77d4d2535232fa97b7789ff6fb516c63201c5e44'
    const txOut = await client.blockchain.getTxOut(txId, 0)
    expect(txOut).toHaveProperty('bestblock')
    expect(txOut.confirmations).toBeGreaterThanOrEqual(1)
    expect(txOut.value).toStrictEqual(38)
    expect(txOut.scriptPubKey).toHaveProperty('asm')
    expect(txOut.scriptPubKey).toHaveProperty('hex')
    expect(txOut.scriptPubKey.reqSigs).toBeGreaterThanOrEqual(1)
    expect(txOut.scriptPubKey.type).toStrictEqual('pubkeyhash')
    expect(txOut.scriptPubKey.addresses.length).toBeGreaterThanOrEqual(1)
    expect(txOut.scriptPubKey.addresses[0]).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    expect(txOut.coinbase).toBeTruthy()
  })
})
