---
id: design
title: Design
sidebar_label: Design
slug: /design
---

## Promise-based client

To prevent a "callback hell" structure where code gets nested and messy; making it harder to understand.
A `Promise<?>` based design is used as async/await implementation are very mature today, it brings better quality of 
life to modern development.

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'

const client = new JsonRpcClient('http://foo:bar@localhost:8554')
const {blocks} = await client.mining.getMiningInfo()
```

## IEEE-754 arbitrary precision

Due to the dynamic nature of the JavaScript language, it forces all number to be interpolated as IEEE-754 which can 
cause precision to be lost. [JellyfishSDK/jellyfish/issues/18](https://github.com/JellyfishSDK/jellyfish/issues/18)

```js
it('lost precision converting DFI 😥', () => {
  const n = 1200000000.00000001
  const a = JSON.parse(JSON.stringify(n)) * 1.0e8
  expect(a.toString()).toStrictEqual("120000000000000001")
});
```

### JellyfishJSON

**api-core** implements `JellyfishJSON` that allows parsing of JSON with `'lossless'`, `'bignumber'` and 
`'number'` numeric precision.

* **'lossless'** uses LosslessJSON that parses numeric values as LosslessNumber. With LosslessNumber, one can perform
  regular numeric operations, and it will throw an error when this would result in losing information.
* **'bignumber'** parse all numeric values as 'BigNumber' using bignumber.js library.
* **'number'** parse all numeric values as 'Number' and precision will be loss if it exceeds IEEE-754 standard.
* **'PrecisionPath'** provides path based precision mapping, specifying 'bignumber' will automatically map all Number in 
  that path as 'bignumber'. Otherwise, it will default to number, This applies deeply.


As not all numbers parsed are significant in all context, (e.g. `mining.getMiningInfo()`), this allows jellyfish library 
users to use the `number` for non precision sensitive operation (e.g. `networkhashps`) and BigNumber for precision 
sensitive operations.

### ApiClient

As jellyfish is written in TypeScript, all RPC exchanges with a node are typed. BigNumber precision is used for all 
wallet or transaction related operations. While IEEE-754 number is used for all other arbitrary operations.

```ts {3}
export class Wallet {
  async getBalance (minimumConfirmation: number = 0, includeWatchOnly: boolean = false): Promise<BigNumber> {
    return await this.client.call('getbalance', ['*', minimumConfirmation, includeWatchOnly], 'bignumber')
  }
}

```

```ts {2-3,9,13}
export interface MiningInfo {
  blocks: number
  currentblockweight?: number
  //...
}

export class Mining {
  async getNetworkHashPerSecond (nblocks: number = 120, height: number = -1): Promise<number> {
    return await this.client.call('getnetworkhashps', [nblocks, height], 'number')
  }

  async getMiningInfo (): Promise<MiningInfo> {
    return await this.client.call('getmininginfo', [], 'number')
  }
}
```

## Protocol agnostic core

ApiClient in `api-core` is a protocol agnostic DeFiChain client implementation with APIs separated into 
their category. The protocol-agnostic core enables independent communication protocols, allowing
vendor-agnostic middleware adaptable to any needs.

```ts
export abstract class ApiClient {
  /**
   * A promise based procedure call handling
   *
   * @param method Name of the RPC method
   * @param params Array of params as RPC payload
   * @param precision
   * Numeric precision to parse RPC payload as 'lossless', 'bignumber' or 'number'.
   *
   * 'lossless' uses LosslessJSON that parses numeric values as LosslessNumber. With LosslessNumber, one can perform
   * regular numeric operations, and it will throw an error when this would result in losing information.
   *
   * 'bignumber' parse all numeric values as 'BigNumber' using bignumber.js library.
   *
   * 'number' parse all numeric values as 'Number' and precision will be loss if it exceeds IEEE-754 standard.
   *
   * @throws ApiError
   * @throws RpcApiError
   * @throws ClientApiError
   */
  abstract call<T> (method: string, params: any[], precision: Precision): Promise<T>
}
```
