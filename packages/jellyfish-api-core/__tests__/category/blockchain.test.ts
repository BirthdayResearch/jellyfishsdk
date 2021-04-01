import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { BlockVerbo } from '../../src/category/blockchain'

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
    const height: number = 1
    let blockHash: string = ''
    let verbosity: number = 0

    beforeAll(async () => {
      blockHash = await client.blockchain.getBlockHash(height)
    })

    it('test getblock with verbo 0, should return hash', async () => {
      verbosity = 0
      const data: BlockVerbo = await client.blockchain.getBlock(blockHash, verbosity)
      expect(data).not.toBeNull()
    })

    it('test getblock with verbo 1', async () => {
      verbosity = 1
      const data: BlockVerbo = await client.blockchain.getBlock(blockHash, verbosity)
      console.log('data: ', data)
      expect(data).toHaveProperty('hash')
      expect(data.confirmations).toStrictEqual(1)
      expect(data.strippedsize).toStrictEqual(360)
      expect(data.size).toStrictEqual(396)
      expect(data.weight).toStrictEqual(1476)
      expect(data.height).toStrictEqual(1)
      expect(data.masternode).toStrictEqual('e86c027861cc0af423313f4152a44a83296a388eb51bf1a6dde9bd75bed55fb4')
      expect(data.minter).toStrictEqual('mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
      expect(data.mintedBlocks).toStrictEqual(1)
      expect(data.stakeModifier).toStrictEqual('fdd82eafa32300653d3b2d9b98a6650b4b15fe2eb32cdd847d3bf2272514cfbf')
      expect(data.version).toStrictEqual(536870912)
      expect(data.versionHex).toStrictEqual('20000000')
      expect(data.merkleroot).toStrictEqual('00eed320c213f506038fa29f77d4d2535232fa97b7789ff6fb516c63201c5e44')
      expect(data.tx.length).toStrictEqual(1)
      expect(data.tx[0]).toStrictEqual('00eed320c213f506038fa29f77d4d2535232fa97b7789ff6fb516c63201c5e44')
      expect(data).toHaveProperty('time')
      expect(data).toHaveProperty('mediantime')
      expect(data.bits).toStrictEqual('207fffff')
      expect(data.difficulty).toStrictEqual(4.656542373906925e-10)
      expect(data.chainwork).toStrictEqual('0000000000000000000000000000000000000000000000000000000000000004')
      expect(data.nTx).toStrictEqual(1)
      expect(data.previousblockhash).toStrictEqual('0091f00915b263d08eba2091ba70ba40cea75242b3f51ea29f4a1b8d7814cd01')
    })

    it('test getblock with verbo2', async () => {
      verbosity = 2
      const data: BlockVerbo = await client.blockchain.getBlock(blockHash, verbosity)
      console.log('data: ', data)
      // NOTE(canonbrother): The only diff between verbo1 and verbo2 is "tx" format
      expect(data.tx.length).toStrictEqual(1)
      expect(data.tx[0].vin[0].coinbase).toStrictEqual('5100')
      expect(data.tx[0].vin[0].sequence).toStrictEqual(4294967295)
      expect(data.tx[0].vout[0].value).toStrictEqual(38)
      expect(data.tx[0].vout[0].n).toStrictEqual(0)
      expect(data.tx[0].vout[0].scriptPubKey.asm).toStrictEqual('OP_DUP OP_HASH160 b36814fd26190b321aa985809293a41273cfe15e OP_EQUALVERIFY OP_CHECKSIG')
      expect(data.tx[0].vout[0].scriptPubKey).toHaveProperty('hex')
      expect(data.tx[0].vout[0].scriptPubKey.reqSigs).toStrictEqual(1)
      expect(data.tx[0].vout[0].scriptPubKey.type).toStrictEqual('pubkeyhash')
      expect(data.tx[0].vout[0].scriptPubKey.addresses[0]).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    })
  })
})
