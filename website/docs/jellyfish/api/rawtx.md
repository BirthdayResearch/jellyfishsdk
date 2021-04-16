---
id: rawtx
title: Raw Transaction API
sidebar_label: RawTx API
slug: /jellyfish/api/rawtx
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.rawtx.
const something = await client.rawtx.method()
```

## createRawTransaction

Create a transaction spending the given inputs and creating new outputs that returns a hex-encoded raw transaction.
Note that the transaction's inputs are not signed, and it is not stored in the wallet or transmitted to the network.

```ts title="client.rawtx.createRawTransaction()"
interface rawtx {
  createRawTransaction (
    inputs: CreateRawTxIn[],
    outputs: CreateRawTxOut,
    options: CreateRawTxOptions = {}
  ): Promise<string>
}

interface CreateRawTxOptions {
  locktime?: number
  replaceable?: boolean
}

interface CreateRawTxIn {
  txid: string
  vout: number
  sequence?: number
}

interface CreateRawTxOut {
  [address: string]: BigNumber
}
```


## signRawTransactionWithKey

Sign inputs for raw transaction (serialized, hex-encoded), Providing an array of base58-encoded private keys that will 
be the keys used to sign the transaction. An optional array of previous transaction outputs that this transaction 
depends on but may not yet be in the blockchain.

```ts title="client.rawtx.signRawTransactionWithKey()"
interface rawtx {
  signRawTransactionWithKey (
    rawTx: string,
    privKeys: string[],
    prevTxs?: SignRawTxWithKeyPrevTx[],
    options: SignRawTxWithKeyOptions = {}
  ): Promise<SignRawTxWithKeyResult>
}

interface SignRawTxWithKeyPrevTx {
  txid: string
  vout: number
  scriptPubKey: string
  redeemScript?: string
  witnessScript?: string
  amount?: BigNumber
}

interface SignRawTxWithKeyOptions {
  sigHashType?: SigHashType
}

enum SigHashType {
  ALL = 'ALL',
  NONE = 'NONE',
  SINGLE = 'SINGLE',
  ALL_ANYONECANPAY = 'ALL|ANYONECANPAY',
  NONE_ANYONECANPAY = 'NONE|ANYONECANPAY',
  SINGLE_ANYONECANPAY = 'SINGLE|ANYONECANPAY',
}
```

## testMempoolAccept

Returns result of mempool acceptance tests indicating if raw transaction would be accepted by mempool.
This checks if the transaction violates the consensus or policy rules. The fee rate is expressed is DFI/kB, using the 
vSize of the transaction.

```ts title="client.rawtx.testMempoolAccept()"
interface rawtx {
  testMempoolAccept (
      signedTx: string, 
      maxFeeRate: BigNumber = new BigNumber('0')
  ): Promise<TestMempoolAcceptResult>
}

interface TestMempoolAcceptResult {
  txid: string
  allowed: boolean
  'reject-reason'?: string
}

```

## sendRawTransaction

Submit a raw transaction (serialized, hex-encoded) to the connected node and network. The transaction will be sent 
unconditionally to all peers, so using this for manual rebroadcast may degrade privacy by leaking the transaction's 
origin, as nodes will normally not rebroadcast non-wallet transactions already in their mempool.

```ts title="client.rawtx.sendRawTransaction()"
interface rawtx {
  sendRawTransaction (
      signedTx: string, 
      maxFeeRate: BigNumber = new BigNumber('0')
  ): Promise<string>
}
```
