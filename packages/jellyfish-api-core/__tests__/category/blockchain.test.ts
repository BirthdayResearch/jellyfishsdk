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
    it('should getBlock with verbosity 0 and return just a string that is serialized, hex-encoded data for block', async () => {
      const blockHash = await waitForBlockHash(1)
      const hash: string = await client.blockchain.getBlock(blockHash, 0)
      expect(typeof hash).toBe('string')
    })

    it('should getBlock with verbosity 1 and return block with tx as hex', async () => {
      const blockHash = await waitForBlockHash(1)
      const block: blockchain.Block<string> = await client.blockchain.getBlock(blockHash, 1)

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
      const block: blockchain.Block<blockchain.Transaction> = await client.blockchain.getBlock(blockHash, 2)

      expect(block.tx.length).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].vin[0].coinbase).toStrictEqual('5100')
      expect(block.tx[0].vin[0].sequence).toBeGreaterThanOrEqual(4294967295)

      expect(block.tx[0].vout[0].n).toBe(0)
      expect(block.tx[0].vout[0].value.toString(10)).toBe('38')
      expect(block.tx[0].vout[0].value instanceof BigNumber).toBeTruthy()

      expect(block.tx[0].vout[0].scriptPubKey.asm).toBe('OP_DUP OP_HASH160 b36814fd26190b321aa985809293a41273cfe15e OP_EQUALVERIFY OP_CHECKSIG')
      expect(block.tx[0].vout[0].scriptPubKey.hex).toBe('76a914b36814fd26190b321aa985809293a41273cfe15e88ac')
      expect(block.tx[0].vout[0].scriptPubKey.reqSigs).toBeGreaterThanOrEqual(1)
      expect(block.tx[0].vout[0].scriptPubKey.type).toBe('pubkeyhash')
      expect(block.tx[0].vout[0].scriptPubKey.addresses[0].length).toBe(34)

      expect(block.tx[0].vout[0].tokenId).toBe(0)
    })
  })

  describe('getBlockHeader', () => {
    it('should getBlockHeader with verbosity true and return block with tx as hex', async () => {
      const blockHash = await waitForBlockHash(1)
      const blockHeader: blockchain.BlockHeader = await client.blockchain.getBlockHeader(blockHash, true)

      expect(blockHeader.hash.length).toBe(64)

      expect(blockHeader.confirmations).toBeGreaterThanOrEqual(2)
      expect(blockHeader.height).toBeGreaterThanOrEqual(1)

      expect(blockHeader.version).toBeGreaterThanOrEqual(536870912)
      expect(blockHeader.versionHex).toStrictEqual('20000000')
      expect(blockHeader.merkleroot.length).toBe(64)

      expect(blockHeader.time).toBeGreaterThan(1)
      expect(blockHeader.mediantime).toBeGreaterThan(1)

      expect(blockHeader.bits).toStrictEqual('207fffff')
      expect(blockHeader.difficulty).toBeGreaterThan(0)

      expect(blockHeader.chainwork.length).toBe(64)
      expect(blockHeader.nTx).toBeGreaterThanOrEqual(1)
      expect(blockHeader.previousblockhash.length).toBe(64)
      expect(blockHeader.nextblockhash.length).toBe(64)
    })

    it('should getBlockHeader with verbosity false and return a string that is serialized, hex-encoded data for block header', async () => {
      const blockHash = await waitForBlockHash(1)
      const hash: string = await client.blockchain.getBlockHeader(blockHash, false)
      expect(typeof hash).toBe('string')
    })
  })

  describe('getBlockHash', () => {
    it('should getBlockHash', async () => {
      await waitForExpect(async () => {
        const info = await client.blockchain.getBlockchainInfo()
        expect(info.blocks).toBeGreaterThan(1)
      })

      const blockHash: string = await client.blockchain.getBlockHash(1)
      expect(typeof blockHash).toBe('string')
      expect(blockHash.length).toBe(64)
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
      expect(txOut.value instanceof BigNumber).toBe(true)
      expect(txOut.value.toString()).toBe('38')
      expect(txOut.scriptPubKey).toHaveProperty('asm')
      expect(txOut.scriptPubKey).toHaveProperty('hex')
      expect(txOut.scriptPubKey.reqSigs).toBeGreaterThanOrEqual(1)
      expect(txOut.scriptPubKey.type).toBe('pubkeyhash')
      expect(txOut.scriptPubKey.addresses.length).toBeGreaterThanOrEqual(1)
      expect(txOut.scriptPubKey.addresses[0]).toBe('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
      expect(txOut.coinbase).toBe(true)
    })
  })

  describe('getChainTips', () => {
    it('should getChainTips', async () => {
      const chainTips: blockchain.ChainTip[] = await client.blockchain.getChainTips()
      for (let i = 0; i < chainTips.length; i += 1) {
        const data = chainTips[i]
        expect(data.height).toBeGreaterThan(0)
        expect(typeof data.hash).toBe('string')
        expect(data.hash.length).toBe(64)
        expect(data.branchlen).toBeGreaterThanOrEqual(0)
        expect(
          data.status === 'invalid' ||
          data.status === 'headers-only' ||
          data.status === 'valid-headers' ||
          data.status === 'valid-fork' ||
          data.status === 'active'
        ).toBe(true)
      }
    })
  })

  describe('getRawMempool', () => {
    let transactionId = ''

    beforeAll(async () => {
      await client.wallet.setWalletFlag(wallet.WalletFlag.AVOID_REUSE)
      transactionId = await client.wallet.sendToAddress('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU', 0.00001)
    })

    it('should getRawMempool and return array of transaction ids', async () => {
      const rawMempool: string[] = await client.blockchain.getRawMempool(false)

      expect(rawMempool.length > 0).toBe(true)
      expect(typeof rawMempool[0]).toBe('string')
    })

    it('should getRawMempool and return json object', async () => {
      const rawMempool: blockchain.MempoolTx = await client.blockchain.getRawMempool(true)

      const data = rawMempool[transactionId]
      expect(data.fees.base instanceof BigNumber).toBe(true)
      expect(data.fees.modified instanceof BigNumber).toBe(true)
      expect(data.fees.ancestor instanceof BigNumber).toBe(true)
      expect(data.fees.descendant instanceof BigNumber).toBe(true)
      expect(data.fees.base.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.fees.modified.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.fees.ancestor.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.fees.descendant.isGreaterThan(new BigNumber('0'))).toBe(true)

      expect(data.fee instanceof BigNumber).toBe(true)
      expect(data.fee.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.modifiedfee instanceof BigNumber).toBe(true)
      expect(data.modifiedfee.isGreaterThan(new BigNumber('0'))).toBe(true)

      expect(data.vsize instanceof BigNumber).toBe(true)
      expect(data.weight instanceof BigNumber).toBe(true)
      expect(data.height instanceof BigNumber).toBe(true)
      expect(data.time instanceof BigNumber).toBe(true)
      expect(data.vsize.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.weight.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.height.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.time.isGreaterThan(new BigNumber('0'))).toBe(true)

      expect(typeof data.wtxid).toBe('string')
      expect(data.depends.length >= 0).toBe(true)
      expect(data.spentby.length >= 0).toBe(true)
      expect(data['bip125-replaceable']).toBe(false)

      expect(data.descendantcount instanceof BigNumber).toBe(true)
      expect(data.descendantsize instanceof BigNumber).toBe(true)
      expect(data.descendantfees instanceof BigNumber).toBe(true)
      expect(data.descendantcount.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.descendantsize.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.descendantfees.isGreaterThan(new BigNumber('0'))).toBe(true)

      expect(data.ancestorcount instanceof BigNumber).toBe(true)
      expect(data.ancestorsize instanceof BigNumber).toBe(true)
      expect(data.ancestorfees instanceof BigNumber).toBe(true)
      expect(data.ancestorcount.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.ancestorsize.isGreaterThan(new BigNumber('0'))).toBe(true)
      expect(data.ancestorfees.isGreaterThan(new BigNumber('0'))).toBe(true)
    })
  })
})
