import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { Block, RawTx } from '../../src/category/blockchain'

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

  describe('getBlockchainInfo', () => {
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
  })

  describe('getBlock', () => {
    let blockHash: string = ''

    beforeAll(async () => {
      blockHash = await client.blockchain.getBlockHash(1)
    })

    it('test getblock with verbo 0, should return hash', async () => {
      const block: string = await client.blockchain.getBlock(blockHash, 0)
      expect(block).not.toBeNull()
    })

    it('test getblock with verbo 1', async () => {
      const block: Block<string> = await client.blockchain.getBlock(blockHash, 1)
      expect(block).toHaveProperty('hash')
      expect(block.confirmations).toBeGreaterThanOrEqual(2)
      expect(block.strippedsize).toBeGreaterThanOrEqual(360)
      expect(block.size).toBeGreaterThanOrEqual(396)
      expect(block.weight).toBeGreaterThanOrEqual(1476)
      expect(block.height).toBeGreaterThanOrEqual(1)
      expect(block.masternode).toStrictEqual('e86c027861cc0af423313f4152a44a83296a388eb51bf1a6dde9bd75bed55fb4')
      expect(block.minter).toStrictEqual('mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
      expect(block.mintedBlocks).toBeGreaterThanOrEqual(1)
      expect(block.stakeModifier).toStrictEqual('fdd82eafa32300653d3b2d9b98a6650b4b15fe2eb32cdd847d3bf2272514cfbf')
      expect(block.version).toBeGreaterThanOrEqual(536870912)
      expect(block.versionHex).toStrictEqual('20000000')
      expect(block.merkleroot).toStrictEqual('00eed320c213f506038fa29f77d4d2535232fa97b7789ff6fb516c63201c5e44')
      expect(block.tx.length).toBeGreaterThanOrEqual(1)
      expect(block.tx[0]).toStrictEqual('00eed320c213f506038fa29f77d4d2535232fa97b7789ff6fb516c63201c5e44')
      expect(block).toHaveProperty('time')
      expect(block).toHaveProperty('mediantime')
      expect(block.bits).toStrictEqual('207fffff')
      expect(block).toHaveProperty('difficulty')
      expect(block.chainwork).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000004')
      expect(block.nTx).toBeGreaterThanOrEqual(1)
      expect(block.previousblockhash).toStrictEqual('0091f00915b263d08eba2091ba70ba40cea75242b3f51ea29f4a1b8d7814cd01')

      // NOTE(canonbrother): Get block without verbo, the verbo default should be 1
      const blockWithoutVerbo: string = await client.blockchain.getBlock(blockHash)
      expect(blockWithoutVerbo).toStrictEqual(block)
    })

    it('test getblock with verbo2', async () => {
      const block: Block<RawTx> = await client.blockchain.getBlock(blockHash, 2)
      // NOTE(canonbrother): The only diff between verbo1 and verbo2 is "tx" format
      expect(block.tx.length).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].vin[0].coinbase).toStrictEqual('5100')
      expect(block.tx[0].vin[0].sequence).toBeGreaterThanOrEqual(4294967295)
      expect(block.tx[0].vout[0].value).toBeGreaterThanOrEqual(38)
      expect(block.tx[0].vout[0].n).toBeGreaterThanOrEqual(0)
      expect(block.tx[0].vout[0].scriptPubKey.asm).toStrictEqual('OP_DUP OP_HASH160 b36814fd26190b321aa985809293a41273cfe15e OP_EQUALVERIFY OP_CHECKSIG')
      expect(block.tx[0].vout[0].scriptPubKey).toHaveProperty('hex')
      expect(block.tx[0].vout[0].scriptPubKey.reqSigs).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].vout[0].scriptPubKey.type).toStrictEqual('pubkeyhash')
      expect(block.tx[0].vout[0].scriptPubKey.addresses[0]).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    })
  })

  describe('getBlockHash', () => {
    it('should getBlockHash', async () => {
      const blockHash: string = await client.blockchain.getBlockHash(1)
      expect(blockHash).not.toBeNull()
    })
  })

  describe('getBlockCount', () => {
    it('should getBlockCount', async () => {
      const blockCount: number = await client.blockchain.getBlockCount()
      expect(blockCount).toBeGreaterThanOrEqual(2)
    })
  })
})
