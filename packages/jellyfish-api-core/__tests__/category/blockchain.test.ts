import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { BigNumber, blockchain, wallet } from '../../src'

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

    expect(info.chain).toStrictEqual('regtest')
    expect(info.blocks).toStrictEqual(0)
    expect(info.headers).toStrictEqual(0)

    expect(info.bestblockhash.length).toStrictEqual(64)
    expect(info.difficulty).toBeGreaterThan(0)
    expect(info.mediantime).toBeGreaterThan(1550000000)

    expect(info.verificationprogress).toStrictEqual(1)
    expect(info.initialblockdownload).toStrictEqual(true)
    expect(info.chainwork.length).toStrictEqual(64)
    expect(info.size_on_disk).toBeGreaterThan(0)
    expect(info.pruned).toStrictEqual(false)

    expect(info.softforks.amk.type).toStrictEqual('buried')
    expect(info.softforks.amk.active).toStrictEqual(true)
    expect(info.softforks.amk.height).toStrictEqual(0)

    expect(info.softforks.segwit.type).toStrictEqual('buried')
    expect(info.softforks.segwit.active).toStrictEqual(true)
    expect(info.softforks.segwit.height).toStrictEqual(0)
  })
})

describe('masternode', () => {
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

  /**
   * Wait for block hash to reach a certain height
   */
  async function waitForBlockHash (height: number): Promise<string> {
    await waitForExpect(async () => {
      const info = await client.blockchain.getBlockchainInfo()
      expect(info.blocks).toBeGreaterThan(height)
    })

    return await client.blockchain.getBlockHash(height)
  }

  describe('getBlockchainInfo', () => {
    it('should getBlockchainInfo', async () => {
      await waitForExpect(async () => {
        const info = await client.blockchain.getBlockchainInfo()
        expect(info.blocks).toBeGreaterThan(1)
      })

      const info = await client.blockchain.getBlockchainInfo()

      expect(info.chain).toStrictEqual('regtest')
      expect(info.blocks).toBeGreaterThan(0)
      expect(info.headers).toBeGreaterThan(0)

      expect(info.bestblockhash.length).toStrictEqual(64)
      expect(info.difficulty).toBeGreaterThan(0)
      expect(info.mediantime).toBeGreaterThan(1550000000)

      expect(info.verificationprogress).toStrictEqual(1)
      expect(info.initialblockdownload).toStrictEqual(false)
      expect(info.chainwork.length).toStrictEqual(64)
      expect(info.size_on_disk).toBeGreaterThan(0)
      expect(info.pruned).toStrictEqual(false)
    })
  })

  describe('getBlock', () => {
    it('should getBlock with verbosity 0 and return just a string that is serialized, hex-encoded data for block', async () => {
      const blockHash = await waitForBlockHash(1)
      const hash: string = await client.blockchain.getBlock(blockHash, 0)
      expect(typeof hash).toStrictEqual('string')
    })

    it('should getBlock with verbosity 1 and return block with tx as hex', async () => {
      const blockHash = await waitForBlockHash(1)
      const block: blockchain.Block<string> = await client.blockchain.getBlock(blockHash, 1)

      expect(block.hash.length).toStrictEqual(64)

      expect(block.confirmations).toBeGreaterThanOrEqual(2)
      expect(block.strippedsize).toBeGreaterThanOrEqual(360)

      expect(block.size).toBeGreaterThanOrEqual(396)
      expect(block.weight).toBeGreaterThanOrEqual(1476)
      expect(block.height).toBeGreaterThanOrEqual(1)

      expect(block.masternode.length).toStrictEqual(64)
      expect(block.minter.length).toStrictEqual(34) // legacy address length

      expect(block.mintedBlocks).toBeGreaterThanOrEqual(1)
      expect(block.stakeModifier.length).toStrictEqual(64)
      expect(block.version).toBeGreaterThanOrEqual(536870912)
      expect(block.versionHex).toStrictEqual('20000000')
      expect(block.merkleroot.length).toStrictEqual(64)

      expect(block.tx.length).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].length).toStrictEqual(64)

      expect(block.time).toBeGreaterThan(1)
      expect(block.mediantime).toBeGreaterThan(1)

      expect(block.bits).toStrictEqual('207fffff')
      expect(block.difficulty).toBeGreaterThan(0)

      expect(block.chainwork.length).toStrictEqual(64)
      expect(block.nTx).toBeGreaterThanOrEqual(1)
      expect(block.previousblockhash.length).toStrictEqual(64)
    })

    it('should getBlock with verbosity 2 and return block with tx as RawText', async () => {
      const blockHash = await waitForBlockHash(1)
      const block: blockchain.Block<blockchain.Transaction> = await client.blockchain.getBlock(blockHash, 2)

      expect(block.tx.length).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].vin[0].coinbase).toStrictEqual('5100')
      expect(block.tx[0].vin[0].sequence).toBeGreaterThanOrEqual(4294967295)

      expect(block.tx[0].vout[0].n).toStrictEqual(0)
      expect(block.tx[0].vout[0].value.toString(10)).toStrictEqual('38')
      expect(block.tx[0].vout[0].value instanceof BigNumber).toBeTruthy()

      expect(block.tx[0].vout[0].scriptPubKey.asm).toStrictEqual('OP_DUP OP_HASH160 b36814fd26190b321aa985809293a41273cfe15e OP_EQUALVERIFY OP_CHECKSIG')
      expect(block.tx[0].vout[0].scriptPubKey.hex).toStrictEqual('76a914b36814fd26190b321aa985809293a41273cfe15e88ac')
      expect(block.tx[0].vout[0].scriptPubKey.reqSigs).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].vout[0].scriptPubKey.type).toStrictEqual('pubkeyhash')
      expect(block.tx[0].vout[0].scriptPubKey.addresses[0].length).toStrictEqual(34)

      expect(block.tx[0].vout[0].tokenId).toStrictEqual(0)
    })
  })

  describe('getBlockHeader', () => {
    it('should getBlockHeader with verbosity true and return block with tx as hex', async () => {
      const blockHash = await waitForBlockHash(1)
      const blockHeader: blockchain.BlockHeader = await client.blockchain.getBlockHeader(blockHash, true)

      expect(blockHeader.hash.length).toStrictEqual(64)

      expect(blockHeader.confirmations).toBeGreaterThanOrEqual(2)
      expect(blockHeader.height).toBeGreaterThanOrEqual(1)

      expect(blockHeader.version).toBeGreaterThanOrEqual(536870912)
      expect(blockHeader.versionHex).toStrictEqual('20000000')
      expect(blockHeader.merkleroot.length).toStrictEqual(64)

      expect(blockHeader.time).toBeGreaterThan(1)
      expect(blockHeader.mediantime).toBeGreaterThan(1)

      expect(blockHeader.bits).toStrictEqual('207fffff')
      expect(blockHeader.difficulty).toBeGreaterThan(0)

      expect(blockHeader.chainwork.length).toStrictEqual(64)
      expect(blockHeader.nTx).toBeGreaterThanOrEqual(1)
      expect(blockHeader.previousblockhash.length).toStrictEqual(64)
      expect(blockHeader.nextblockhash.length).toStrictEqual(64)
    })

    it('should getBlockHeader with verbosity false and return a string that is serialized, hex-encoded data for block header', async () => {
      const blockHash = await waitForBlockHash(1)
      const hash: string = await client.blockchain.getBlockHeader(blockHash, false)
      expect(typeof hash).toStrictEqual('string')
    })
  })

  describe('getBlockHash', () => {
    it('should getBlockHash', async () => {
      await waitForExpect(async () => {
        const info = await client.blockchain.getBlockchainInfo()
        expect(info.blocks).toBeGreaterThan(1)
      })

      const blockHash: string = await client.blockchain.getBlockHash(1)
      expect(typeof blockHash).toStrictEqual('string')
      expect(blockHash.length).toStrictEqual(64)
    })
  })

  describe('getBlockCount', () => {
    it('should getBlockCount', async () => {
      await waitForExpect(async () => {
        const info = await client.blockchain.getBlockchainInfo()
        expect(info.blocks).toBeGreaterThan(1)
      })

      const blockCount: number = await client.blockchain.getBlockCount()
      expect(blockCount).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getTxOut', () => {
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

  describe('getChainTips', () => {
    it('should getChainTips', async () => {
      const chainTips: blockchain.ChainTip[] = await client.blockchain.getChainTips()
      for (let i = 0; i < chainTips.length; i += 1) {
        const data = chainTips[i]
        expect(data.height).toBeGreaterThan(0)
        expect(typeof data.hash).toStrictEqual('string')
        expect(data.hash.length).toStrictEqual(64)
        expect(data.branchlen).toBeGreaterThanOrEqual(0)
        expect(['invalid', 'headers-only', 'valid-headers', 'valid-fork', 'active'].includes(data.status)).toStrictEqual(true)
      }
    })
  })

  describe('getRawMempool', () => {
    beforeAll(async () => {
      await client.wallet.setWalletFlag(wallet.WalletFlag.AVOID_REUSE)
    })

    it('should getRawMempool and return array of transaction ids', async () => {
      await waitForExpect(async () => {
        await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00001)

        const rawMempool: string[] = await client.blockchain.getRawMempool(false)
        expect(rawMempool.length > 0).toStrictEqual(true)
        expect(typeof rawMempool[0]).toStrictEqual('string')
      }, 10000)
    })

    it('should getRawMempool and return json object', async () => {
      await waitForExpect(async () => {
        const transactionId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00001)
        const rawMempool: blockchain.MempoolTx = await client.blockchain.getRawMempool(true)

        const data = rawMempool[transactionId]
        expect(data.fees.base instanceof BigNumber).toStrictEqual(true)
        expect(data.fees.modified instanceof BigNumber).toStrictEqual(true)
        expect(data.fees.ancestor instanceof BigNumber).toStrictEqual(true)
        expect(data.fees.descendant instanceof BigNumber).toStrictEqual(true)
        expect(data.fees.base.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.fees.modified.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.fees.ancestor.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.fees.descendant.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

        expect(data.fee instanceof BigNumber).toStrictEqual(true)
        expect(data.fee.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.modifiedfee instanceof BigNumber).toStrictEqual(true)
        expect(data.modifiedfee.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

        expect(data.vsize instanceof BigNumber).toStrictEqual(true)
        expect(data.weight instanceof BigNumber).toStrictEqual(true)
        expect(data.height instanceof BigNumber).toStrictEqual(true)
        expect(data.time instanceof BigNumber).toStrictEqual(true)
        expect(data.vsize.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.weight.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.height.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.time.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

        expect(typeof data.wtxid).toStrictEqual('string')
        expect(data.depends.length >= 0).toStrictEqual(true)
        expect(data.spentby.length >= 0).toStrictEqual(true)
        expect(data['bip125-replaceable']).toStrictEqual(false)

        expect(data.descendantcount instanceof BigNumber).toStrictEqual(true)
        expect(data.descendantsize instanceof BigNumber).toStrictEqual(true)
        expect(data.descendantfees instanceof BigNumber).toStrictEqual(true)
        expect(data.descendantcount.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.descendantsize.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.descendantfees.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)

        expect(data.ancestorcount instanceof BigNumber).toStrictEqual(true)
        expect(data.ancestorsize instanceof BigNumber).toStrictEqual(true)
        expect(data.ancestorfees instanceof BigNumber).toStrictEqual(true)
        expect(data.ancestorcount.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.ancestorsize.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
        expect(data.ancestorfees.isGreaterThan(new BigNumber('0'))).toStrictEqual(true)
      })
    })
  })

  describe('getBlockStats', () => {
    it('should get blockchain stats and return  all values', async () => {
      const blockHash = await waitForBlockHash(1)
      const stats = await client.blockchain.getBlockStats(blockHash)

      expect(stats.height).toBeGreaterThanOrEqual(1)
      expect(stats.minfee).toBeLessThanOrEqual(stats.medianfee)
      expect(stats.medianfee).toBeLessThanOrEqual(stats.maxfee)
    })

    it('should  get blockchain stats with specific values', async () => {
      const blockHash = await waitForBlockHash(1)
      const stats = await client.blockchain.getBlockStats(blockHash, ['avgfee', 'height'])

      expect('height' in stats).toBeTruthy()
      expect('avgfee' in stats).toBeTruthy()
      expect(stats.height).toBeGreaterThanOrEqual(1)
      expect(Object.keys(stats).length).toEqual(2)
    })
  })
  describe('getBestBlockHash', () => {
    test('should Get hash of best block and return a string', async () => {
      const bestBlockHash = await client.blockchain.getBestBlockHash()
      expect(bestBlockHash).toBeTruthy()
    })
  })
})
