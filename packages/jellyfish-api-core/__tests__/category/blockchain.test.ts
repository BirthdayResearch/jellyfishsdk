import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { Block, Transaction } from '../../src'

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
    /**
     * Wait for block hash to reach a certain height
     */
    async function waitForBlockHash (height: number): Promise<string> {
      await waitForExpect(async () => {
        const info = await client.blockchain.getBlockchainInfo()
        await expect(info.blocks).toBeGreaterThan(height)
      })

      return await client.blockchain.getBlockHash(height)
    }

    it('should getBlock with verbosity 0 and return just a string that is serialized, hex-encoded data for block', async () => {
      const blockHash = await waitForBlockHash(1)
      const hash: string = await client.blockchain.getBlock(blockHash, 0)

      expect(hash).not.toBeNull()
    })

    it('should getBlock with verbosity 1 and return block with tx as hex', async () => {
      const blockHash = await waitForBlockHash(1)
      const block: Block<string> = await client.blockchain.getBlock(blockHash, 1)

      expect(block.hash.length).toBe(64)

      expect(block.confirmations).toBeGreaterThanOrEqual(2)
      expect(block.strippedsize).toBeGreaterThanOrEqual(360)

      expect(block.size).toBeGreaterThanOrEqual(396)
      expect(block.weight).toBeGreaterThanOrEqual(1476)
      expect(block.height).toBeGreaterThanOrEqual(1)

      expect(block.masternode.length).toBe(64)
      expect(block.minter.length).toBe(34) // legacy address length

      expect(block.mintedBlocks).toBeGreaterThanOrEqual(1)
      expect(block.stakeModifier.length).toBe(64)
      expect(block.version).toBeGreaterThanOrEqual(536870912)
      expect(block.versionHex).toStrictEqual('20000000')
      expect(block.merkleroot.length).toBe(64)

      expect(block.tx.length).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].length).toBe(64)

      expect(block.time).toBeGreaterThan(1)
      expect(block.mediantime).toBeGreaterThan(1)

      expect(block.bits).toStrictEqual('207fffff')
      expect(block.difficulty).toBeGreaterThan(0)

      expect(block.chainwork.length).toBe(64)
      expect(block.nTx).toBeGreaterThanOrEqual(1)
      expect(block.previousblockhash.length).toBe(64)
    })

    it('should getBlock with verbosity 2 and return block with tx as RawText', async () => {
      const blockHash = await waitForBlockHash(1)
      const block: Block<Transaction> = await client.blockchain.getBlock(blockHash, 2)

      expect(block.tx.length).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].vin[0].coinbase).toStrictEqual('5100')
      expect(block.tx[0].vin[0].sequence).toBeGreaterThanOrEqual(4294967295)

      expect(block.tx[0].vout[0].value).toBeGreaterThanOrEqual(38)
      expect(block.tx[0].vout[0].n).toBeGreaterThanOrEqual(0)

      expect(block.tx[0].vout[0].scriptPubKey.asm).toStrictEqual('OP_DUP OP_HASH160 b36814fd26190b321aa985809293a41273cfe15e OP_EQUALVERIFY OP_CHECKSIG')
      expect(block.tx[0].vout[0].scriptPubKey).toHaveProperty('hex')
      expect(block.tx[0].vout[0].scriptPubKey.reqSigs).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].vout[0].scriptPubKey.type).toStrictEqual('pubkeyhash')
      expect(block.tx[0].vout[0].scriptPubKey.addresses[0].length).toBe(34)
    })
  })

  describe('getBlockHash', () => {
    it('should getBlockHash', async () => {
      await waitForExpect(async () => {
        const info = await client.blockchain.getBlockchainInfo()
        await expect(info.blocks).toBeGreaterThan(1)
      })

      const blockHash: string = await client.blockchain.getBlockHash(1)
      expect(blockHash).not.toBeNull()
      expect(blockHash.length).toBe(64)
    })
  })

  describe('getBlockCount', () => {
    it('should getBlockCount', async () => {
      await waitForExpect(async () => {
        const info = await client.blockchain.getBlockchainInfo()
        await expect(info.blocks).toBeGreaterThan(1)
      })

      const blockCount: number = await client.blockchain.getBlockCount()
      expect(blockCount).toBeGreaterThanOrEqual(2)
    })
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
