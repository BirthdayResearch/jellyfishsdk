---
id: rawtx
title: Raw Transaction API
sidebar_label: RawTx API
slug: /jellyfish/api/rawtx
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

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

## decodeRawTransaction

Return a JSON object representing the serialized, hex-encoded transaction.
If iswitness is not present, heuristic tests will be used in decoding.
If true, only witness deserialization will be tried.
If false, only non-witness deserialization will be tried.
This boolean should reflect whether the transaction has inputs
(e.g. fully valid, or on-chain transactions), if known by the caller.

```ts title="client.rawtx.decodeRawTransaction()"
interface rawtx {
  decodeRawTransaction (
    hexstring: string,
    iswitness: boolean
  ): Promise<RawTransaction>
}

interface RawTransaction {
  in_active_chain?: boolean
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
  blockhash: string
  confirmations: number
  time: number
  blocktime: number
}
```

## signRawTransactionWithKey

Sign inputs for raw transaction (serialized, hex-encoded), providing an array of base58-encoded private keys that will 
be the keys used to sign the transaction. An optional array of previous transaction outputs that this transaction 
depends on but may not yet be in the blockchain.

```ts title="client.rawtx.signRawTransactionWithKey()"
interface rawtx {
  signRawTransactionWithKey (
    rawTx: string,
    privKeys: string[],
    options: SignRawTxWithKeyOptions = {}
  ): Promise<SignRawTxWithKeyResult>
}

interface SignRawTxWithKeyOptions {
  prevTxs?: SignRawTxWithKeyPrevTx[]
  sigHashType?: SigHashType
}

interface SignRawTxWithKeyPrevTx {
  txid: string
  vout: number
  scriptPubKey: string
  redeemScript?: string
  witnessScript?: string
  amount?: BigNumber
}

enum SigHashType {
  ALL = 'ALL',
  NONE = 'NONE',
  SINGLE = 'SINGLE',
  ALL_ANYONECANPAY = 'ALL|ANYONECANPAY',
  NONE_ANYONECANPAY = 'NONE|ANYONECANPAY',
  SINGLE_ANYONECANPAY = 'SINGLE|ANYONECANPAY',
}

interface SignRawTxWithKeyResult {
  hex: string
  complete: boolean
  errors: Array<SignRawTxWithKeyError>
}

interface SignRawTxWithKeyError {
  txid: string
  vout: number
  scriptSig: string
  sequence: number
  error: string
}
```

## testMempoolAccept

Returns result of mempool acceptance tests indicating if raw transaction would be accepted by mempool.
This checks if the transaction violates the consensus or policy rules. The fee rate is expressed in DFI/kB, using the 
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

## getRawTransaction

Get raw transaction data

```ts title="client.rawtx.getRawTransaction()"
interface rawtx {
  getRawTransaction (txid: string, verbose: false): Promise<string>
  getRawTransaction (txid: string, verbose: false, blockHash: string): Promise<string>
  getRawTransaction (txid: string, verbose: true): Promise<RawTransaction>
  getRawTransaction (txid: string, verbose: true, blockHash: string): Promise<RawTransaction>
  getRawTransaction (txid: string, verbose?: boolean, blockHash?: string): Promise<string | RawTransaction>
}

interface RawTransaction {
  in_active_chain?: boolean
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
  blockhash: string
  confirmations: number
  time: number
  blocktime: number
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
  tokenId: number
}

interface ScriptPubKey {
  asm: string
  hex: string
  type: string
  reqSigs: number
  addresses: string[]
}
```

## decodeScript

Decode a hex-encoded script.

```ts title="client.rawtx.decodeScript()"
interface rawtx {
  decodeScript (hexstring: string): Promise<DecodeScriptResult>
}

interface DecodeScriptResult {
  asm: string
  type: string
  reqSigs: number
  addresses: string[]
  p2sh: string
  segwit: {
    asm: string
    hex: string
    type: string
    reqSigs: number
    addresses: string[]
    p2sh-segwit: string
  }
}