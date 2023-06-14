---
id: evm
title: EVM API
sidebar_label: EVM API
slug: /jellyfish/api/evm
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

// Using client.evm.
const something = await client.evm.method()
```

## EVM

Creates an EVM transaction submitted to local node and network.

```ts title="client.evm.evmTx()"
interface evm {
  evmTx (options: EvmTxOptions): Promise<string>
}

interface EvmTxOptions {
  from: string
  nonce: number
  gasPrice: number
  gasLimit: number
  to: string
  value: BigNumber
  data?: string
}