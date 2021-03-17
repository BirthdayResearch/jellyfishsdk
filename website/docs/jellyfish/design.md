---
id: design
title: Jellyfish Design
sidebar_label: Jellyfish Design
slug: /jellyfish/design
---

## Conventional defaults

`@defichain/jellyfish` package provides conventional defaults and bundle all code required for dApps building. 

```js
import { Client, HttpProvider } from '@defichain/jellyfish'

// Coventional Defaults
let client = new Client()

// Explicit Configuration
client = new Client(new HttpProvider('http://foo:bar@localhost:8554'), {
    timeout: 30000
})
```

## Promise-based client

To prevent a "callback hell" structure where code get nested and messy; making it harder to understand.
A `Promise<?>` based design is used as async/await implementation are very mature today, it brings better quality of 
life to modern development.

```js
import {Client} from '@defichain/jellyfish'

const client = new Client()
const {blocks} = await client.mining.getMintingInfo()
```

## IEEE-754 arbitrary precision

Due to the dynamic nature of the JavaScript language, it forces all number to be interpolated as IEEE-754 which can 
cause precision to be lost. [DeFiCh/jellyfish/issues/18](https://github.com/DeFiCh/jellyfish/issues/18)

```js
it('lost precision converting DFI 😥', () => {
  const n = 1200000000.00000001
  const a = JSON.parse(JSON.stringify(n)) * 1.0e8
  expect(a.toString()).toBe("120000000000000001")
});
```

### `JellyfishJSON`

**api-core** implements `JellyfishJSON` that allows parsing of JSON with `'lossless'`, `'bignumber'` and 
`'number'` numeric precision.

* **'lossless'** uses LosslessJSON that parses numeric values as LosslessNumber. With LosslessNumber, one can perform
  regular numeric operations, and it will throw an error when this would result in losing information.
* **'bignumber'** parse all numeric values as 'BigNumber' using bignumber.js library.
* **'number'** parse all numeric values as 'Number' and precision will be loss if it exceeds IEEE-754 standard.


As not all number parsed are significant in all context, (e.g. `mining.getMintingInfo()`), this allows jellyfish library 
users to use the `number` for non precision sensitive operation (e.g. `networkhashps`) and BigNumber for precision 
sensitive operations.

### `JellyfishClient`

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
export interface MintingInfo {
  blocks: number
  currentblockweight?: number
  //...
}

export class Mining {
  async getNetworkHashPerSecond (nblocks: number = 120, height: number = -1): Promise<number> {
    return await this.client.call('getnetworkhashps', [nblocks, height], 'number')
  }

  async getMintingInfo (): Promise<MintingInfo> {
    return await this.client.call('getmintinginfo', [], 'number')
  }
}
```

## Protocol agnostic core

JellyfishClient in `api-core` is a protocol agnostic DeFiChain client implementation with APIs separated into 
their category. The protocol-agnostic core enable independent communication protocols, allowing
vendor-agnostic middleware adaptable to any needs.

```ts
export abstract class JellyfishClient {
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
   * @throws JellyfishError
   * @throws JellyfishRPCError
   * @throws JellyfishClientError
   */
  abstract call<T> (method: string, params: any[], precision: Precision): Promise<T>
}
```
