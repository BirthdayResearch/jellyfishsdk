---
id: blockchain
title: Blockchain API
sidebar_label: Blockchain API
slug: /jellyfish/api/blockchain
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

// Using client.blockchain.
const something = await client.blockchain.method()
```

## getBlockchainInfo

Get various state info regarding blockchain processing.

```ts title="client.blockchain.getBlockchainInfo()"
interface blockchain {
  getBlockchainInfo (): Promise<BlockchainInfo>
}

interface BlockchainInfo {
  chain: 'main' | 'test' | 'regtest' | string
  blocks: number
  headers: number
  bestblockhash: string
  difficulty: number
  mediantime: number
  verificationprogress: number
  initialblockdownload: boolean
  chainwork: string
  size_on_disk: number
  pruned: boolean
  softforks: {
    [id: string]: {
      type: 'buried' | 'bip9'
      active: boolean
      height: number
    }
  }
  warnings: string
}
```

## getBlock

Get block data with a provided block header hash.

```ts title="client.blockchain.getBlock()"
interface blockchain {
  getBlock (hash: string, verbosity: 0): Promise<string>
  getBlock (hash: string, verbosity: 1): Promise<Block<string>>
  getBlock (hash: string, verbosity: 2): Promise<Block<Transaction>>
  getBlock<T> (hash: string, verbosity: 0 | 1 | 2): Promise<string | Block<T>>
}

interface Block<T> {
  hash: string
  confirmations: number
  strippedsize: number
  size: number
  weight: number
  height: number
  masternode: string
  minter: string
  mintedBlocks: number
  stakeModifier: string
  version: number
  versionHex: string
  merkleroot: string
  time: number
  mediantime: number
  bits: string
  difficulty: number
  chainwork: string
  tx: T[]
  nTx: number
  previousblockhash: string
  nextblockhash: string
}

interface Transaction {
  txid: string
  hash: string
  version: number
  size: number
  vsize: number
  weight: number
  locktime: number
  vin: Vin[]
  vout: Vout[]
  hex: string
}

interface Vin {
  coinbase?: string
  txid: string
  vout: number
  scriptSig: {
    asm: string
    hex: string
  }
  txinwitness?: string[]
  sequence: string
}

interface Vout {
  value: BigNumber
  n: number
  scriptPubKey: ScriptPubKey
  tokenId: string
}

interface ScriptPubKey {
  asm: string
  hex: string
  type: string
  reqSigs: number
  addresses: string[]
}
```

## getBlockHeader

Get block header data with particular header hash.

```ts title="client.blockchain.getBlockHeader()"
interface blockchain {
  getBlockHeader (hash: string, verbosity: true): Promise<BlockHeader>
  getBlockHeader (hash: string, verbosity: false): Promise<string>
}

interface BlockHeader {
  hash: string
  confirmations: number
  height: number
  version: number
  versionHex: string
  merkleroot: string
  time: number
  mediantime: number
  bits: string
  difficulty: number
  chainwork: string
  nTx: number
  previousblockhash: string
  nextblockhash: string
}
```

## getBlockHash

Get a hash of block in best-block-chain at height provided.

```ts title="client.blockchain.getBlockHash()"
interface blockchain {
  getBlockHash(height: number): Promise<string>
}
```

## getBlockCount

Get the height of the most-work fully-validated chain.

```ts title="client.blockchain.getBlockCount()"
interface blockchain {
  getBlockCount (): Promise<number>
}
```

## getChainTips

Return information about all known tips in the block tree
including the main chain as well as orphaned branches.

```ts title="client.blockchain.getChainTips()"
interface blockchain {
  getChainTips (): Promise<ChainTip[]>
}

interface ChainTip {
  height: number
  hash: string
  branchlen: number
  status: string
}
```

## getDifficulty

Return the proof-of-work difficulty as a multiple of the minimum difficulty.

```ts tile="client.blockchain.getDifficulty()"
interface blockchain {
    getDifficulty (): Promise<number>
}
```

## getTxOut

Get details of unspent transaction output (UTXO).

```ts title="client.blockchain.getTxOut()"
interface blockchain {
  getTxOut (txId: string, n: number, includeMempool = true): Promise<UTXODetails>
}

interface UTXODetails {
  bestblock: string
  confirmations: number
  value: BigNumber
  scriptPubKey: ScriptPubKey
  coinbase: boolean
}

interface ScriptPubKey {
  asm: string
  hex: string
  type: string
  reqSigs: number
  addresses: string[]
  tokenId: string
}
```

## getTxOutSetInfo

Returns statistics about the unspent transaction output set.
Note this call may take some time.

```ts title="client.blockchain.getTxOutSetInfo()"
interface blockchain {
  getTxOutSetInfo (): Promise<TxOutSetInfo>
}

interface TxOutSetInfo {
  height: number
  bestblock: string
  transactions: Number
  txouts: Number
  bogosize: Number
  hash_serialized_2: string
  disk_size: Number
  total_amount: BigNumber
}
```

## getRawMempool

Get all transaction ids in memory pool as string[] if verbose is false else as json object

```ts title="client.blockchain.getRawMempool()"
interface blockchain {
  getRawMempool (verbose: false): Promise<string[]>
  getRawMempool (verbose: true): Promise<MempoolTx>
  getRawMempool (verbose: boolean): Promise<string[] | MempoolTx>
}

interface MempoolTx {
  [key: string]: {
    vsize: BigNumber
    /**
     * @deprecated same as vsize. Only returned if defid is started with -deprecatedrpc=size
     */
    size: BigNumber
    weight: BigNumber
    fee: BigNumber
    modifiedfee: BigNumber
    time: BigNumber
    height: BigNumber
    descendantcount: BigNumber
    descendantsize: BigNumber
    descendantfees: BigNumber
    ancestorcount: BigNumber
    ancestorsize: BigNumber
    ancestorfees: BigNumber
    wtxid: string
    fees: {
      base: BigNumber
      modified: BigNumber
      ancestor: BigNumber
      descendant: BigNumber
    }
    depends: string[]
    spentby: string[]
    'bip125-replaceable': boolean
  }
}
```

## getMempoolAncestors

Get all in-mempool ancestors if a transaction id is in mempool as string[] if verbose is false else as json object

```ts title="client.blockchain.getMempoolAncestors()"
interface blockchain {
  getMempoolAncestors (txId: string, verbose?: false): Promise<string[]>
  getMempoolAncestors (txId: string, verbose?: true): Promise<MempoolTx>
  getMempoolAncestors (txId: string, verbose?: boolean: Promise<string[] | MempoolTx>
}

interface MempoolTx {
  [key: string]: {
    vsize: BigNumber
    /**
     * @deprecated same as vsize. Only returned if defid is started with -deprecatedrpc=size
     */
    size: BigNumber
    weight: BigNumber
    fee: BigNumber
    modifiedfee: BigNumber
    time: BigNumber
    height: BigNumber
    descendantcount: BigNumber
    descendantsize: BigNumber
    descendantfees: BigNumber
    ancestorcount: BigNumber
    ancestorsize: BigNumber
    ancestorfees: BigNumber
    wtxid: string
    fees: {
      base: BigNumber
      modified: BigNumber
      ancestor: BigNumber
      descendant: BigNumber
    }
    depends: string[]
    spentby: string[]
    'bip125-replaceable': boolean
  }
}
```

## getMempoolDescendants

Get all in-mempool descendants if a transaction id is in mempool as string[] if verbose is false else as json object

```ts title="client.blockchain.getMempoolDescendants()"
interface blockchain {
  getMempoolDescendants (txId: string, verbose?: false): Promise<string[]>
  getMempoolDescendants (txId: string, verbose?: true): Promise<MempoolTx>
  getMempoolDescendants (txId: string, verbose?: boolean: Promise<string[] | MempoolTx>
}

interface MempoolTx {
  [key: string]: {
    vsize: BigNumber
    /**
     * @deprecated same as vsize. Only returned if defid is started with -deprecatedrpc=size
     */
    size: BigNumber
    weight: BigNumber
    fee: BigNumber
    modifiedfee: BigNumber
    time: BigNumber
    height: BigNumber
    descendantcount: BigNumber
    descendantsize: BigNumber
    descendantfees: BigNumber
    ancestorcount: BigNumber
    ancestorsize: BigNumber
    ancestorfees: BigNumber
    wtxid: string
    fees: {
      base: BigNumber
      modified: BigNumber
      ancestor: BigNumber
      descendant: BigNumber
    }
    depends: string[]
    spentby: string[]
    'bip125-replaceable': boolean
  }
}
```

## getMempoolEntry

Get transaction details in the memory pool using a transaction ID.

```ts title="client.blockchain.getMempoolEntry(txId: string)"
interface blockchain {
  getMempoolEntry (txId: string): Promise<MempoolTx>
}
```

## getMempoolInfo

Returns details on the active state of the TX memory pool.

```ts="client.blockchain.getMempoolInfo"
interface blockchain {
  getMempoolInfo (): Promise<MempoolInfo>
}

interface MempoolInfo {
  loaded: boolean
  size: number
  bytes: number
  usage: number
  maxmempool: number
  mempoolminfee: BigNumber
  minrelaytxfee: BigNumber
}
```

## getBlockStats

Get block statistics for a given window. Returns all stats values if nothing is passed in the second param.  

```ts title="client.blockchain.getBlockStats()"
interface blockchain {
  getBlockStats(hashOrHeight: number | string): Promise<BlockStats>
  getBlockStats(hashOrHeight: number | string, stats: Array<keyof BlockStats>): Promise<BlockStats>
}

interface BlockStats {
  avgfee: number
  avgfeerate: number
  avgtxsize: number
  blockhash: string
  height: number
  ins: number
  maxfee: number
  maxfeerate: number
  maxtxsize: number
  medianfee: number
  mediantime: number
  mediantxsize: number
  minfee: number
  minfeerate: number
  mintxsize: number
  outs: number
  subsidy: number
  swtxs: number
  time: number
  totalfee: number
  txs: number
  swtotal_size: number
  swtotal_weight: number
  total_out: number
  total_size: number
  total_weight: number
  utxo_increase: number
  utxo_size_inc: number
  feerate_percentiles: [number, number, number, number, number] 
}
```

## getBestBlockHash

Get the hash of the best (tip) block in the most-work fully-validated chain.

```ts title="client.blockchain.getBestBlockHash()"
interface blockchain {
  getBestBlockHash (): Promise<string>
}
```

## getBlockFilter

Retrieve a BIP 157 content filter for a particular block.

```ts title="client.blockchain.getBlockFilter()"
interface blockchain {
  getBlockFilter (blockHash: string, filterType: string = 'basic'): Promise<BlockFilter>
}

interface BlockFilter {
  filter: string
  header: string
}
```

## waitForNewBlock

Wait for any new block

```ts title="client.blockchain.waitForNewBlock()"
interface blockchain {
  waitForNewBlock (timeout: number = 30000): Promise<WaitBlockResult>
}

interface WaitBlockResult {
  hash: string
  height: number
}
```

## waitForBlock

Waits for a specific new block and returns useful info about it.

```ts title="client.blockchain.waitForBlock()"
interface blockchain {
  waitForBlock (blockhash: string, timeout: number = 30000): Promise<WaitBlockResult>
}

interface WaitBlockResult {
  hash: string
  height: number
}
```

## waitForBlockHeight

Waits for block height equal or higher than provided and returns the height and hash of the current tip.

```ts title="client.blockchain.waitForBlockHeight()"
interface blockchain {
  waitForBlockHeight (height: number, timeout: number = 30000): Promise<waitForBlockHeight>
}

interface WaitBlockResult {
  hash: string
  height: number
}
```

## getChainTxStats

Get statistics about the total number and rate of transactions in the chain.

```ts title="client.blockchain.getChainTxStats()"
interface blockchain {
  getChainTxStats (nBlocks?: number, blockHash?: string): Promise<ChainTxStats>
}

interface ChainTxStats {
  time: number
  txcount: number
  window_final_block_hash: string
  window_final_block_height: number
  window_block_count: number
  window_tx_count: number
  window_interval: number
  txrate: number
}
```
