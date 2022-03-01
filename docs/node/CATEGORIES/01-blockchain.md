---
id: blockchain
title: Blockchain API
sidebar_label: Blockchain API
slug: /jellyfish/api/blockchain
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.blockchain.
const something = await client.blockchain.method()
```

## getBlockchainInfo

Get various state info regarding blockchain processing.

```ts reference title="client.blockchain.getBlockchainInfo()"
interface blockchain {
  getBlockchainInfo (): Promise<BlockchainInfo>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L233-L253')
```

## getBlock

Get block data with a provided block header hash.

```ts reference title="client.blockchain.getBlock()"
interface blockchain {
  getBlock (hash: string, verbosity: 0): Promise<string>
  getBlock (hash: string, verbosity: 1): Promise<Block<string>>
  getBlock (hash: string, verbosity: 2): Promise<Block<Transaction>>
  getBlock<T> (hash: string, verbosity: 0 | 1 | 2): Promise<string | Block<T>>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L255-L278')

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L297-L327')

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L337-L343')
```

## getBlockHeader

Get block header data with particular header hash.

```ts reference title="client.blockchain.getBlockHeader()"
interface blockchain {
  i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L89')
  i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L89')
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L280-L295')
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

```ts reference title="client.blockchain.getChainTips()"
interface blockchain {
  getChainTips (): Promise<ChainTip[]>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L345-L350')
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

```ts reference title="client.blockchain.getTxOut()"
interface blockchain {
  getTxOut (txId: string, n: number, includeMempool = true): Promise<UTXODetails>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L329-L343')
```

## getRawMempool

Get all transaction ids in memory pool as string[] if verbose is false else as json object

```ts reference title="client.blockchain.getRawMempool()"
interface blockchain {
  getRawMempool (verbose: false): Promise<string[]>
  getRawMempool (verbose: true): Promise<MempoolTx>
  getRawMempool (verbose: boolean): Promise<string[] | MempoolTx>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L352-L381')
```

## getMempoolInfo

Returns details on the active state of the TX memory pool.

```ts reference title="client.blockchain.getMempoolInfo"
interface blockchain {
  getMempoolInfo (): Promise<MempoolInfo>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L415-L423')
```

## getBlockStats

Get block statistics for a given window. Returns all stats values if nothing is passed in the second param.  

```ts reference title="client.blockchain.getBlockStats()"
interface blockchain {
  getBlockStats(hashOrHeight: number | string): Promise<BlockStats>
  getBlockStats(hashOrHeight: number | string, stats: Array<keyof BlockStats>): Promise<BlockStats>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L383-L413')
```

## getBestBlockHash

Get the hash of the best (tip) block in the most-work fully-validated chain.

```ts title="client.blockchain.getBestBlockHash()"
interface blockchain {
  getBestBlockHash (): Promise<string>
}
```

## waitForNewBlock

Wait for any new block

```ts reference title="client.blockchain.waitForNewBlock()"
interface blockchain {
  waitForNewBlock (timeout: number = 30000): Promise<WaitBlockResult>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L425-L428')
```

## waitForBlockHeight

Waits for block height equal or higher than provided and returns the height and hash of the current tip.

```ts reference title="client.blockchain.waitForBlockHeight()"
interface blockchain {
  waitForBlockHeight (height: number, timeout: number = 30000): Promise<WaitBlockResult>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L425-L428')
```

## getChainTxStats

Get statistics about the total number and rate of transactions in the chain.

```ts reference title="client.blockchain.getChainTxStats()"
interface blockchain {
  getChainTxStats (nBlocks?: number, blockHash?: string): Promise<ChainTxStats>
}

i('https://github.com/DeFiCh/jellyfish/blob/main/packages/jellyfish-api-core/src/category/blockchain.ts#L430-L439')
```