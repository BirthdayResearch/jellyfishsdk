---
id: usage
title: Using @defichain/testcontainers
sidebar_label: Using testcontainers
slug: /testcontainers/usage
---

* `RegTestContainer` provides a defid node managed in Docker.
* `MasterNodeRegTestContainer` provides a pre-configured masternode with coins auto minting.
* You can use your favourite test runner and set it up as part of the test lifecycle.

## Containers

### `new RegTestContainer()`

```js
import { RegTestContainer } from '@defichain/testcontainers'

describe('reg test container', () => {
  const container = new RegTestContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should getmintinginfo and chain should be regtest', async () => {
    // Using node.call('method', []), the built-in minimalistic rpc call
    const result = await container.call('getmintinginfo', [])
    expect(result.chain).toBe('regtest')
  })
})
```

### `new MasterNodeRegTestContainer()`

```js
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import waitForExpect from "wait-for-expect";

describe('master node pos minting', () => {
  const container = new MasterNodeRegTestContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should wait until coinbase maturity with spendable balance', async () => {
    await waitForExpect(async () => {
      const info = await container.getMintingInfo()
      expect(info.blocks).toBeGreaterThan(100)
    })

    // perform utxostoaccount rpc
    const address = await container.getNewAddress()
    const payload: { [key: string]: string } = {}
    payload[address] = "100@0"
    await container.call("utxostoaccount", [payload])
  })
})
```

## Convenience Methods

### `container.getCachedRpcUrl()`

```js
const container = new RegTestContainer()

// they are dynmaically assigned to host, you can run multiple concurrent tests!
const rpcURL = await container.getCachedRpcUrl()
```

### `container.call('method', [])`

```js
const container = new RegTestContainer()

// raw calls
const { blocks } = await container.call('getmintinginfo')
const address = await container.call('getnewaddress', ['label', 'legacy'])

// basic included methods
const count = await container.getBlockCount()
const info = await container.getMintingInfo()
const newAddress = await container.getNewAddress()
```

## Using with Jellyfish

```js
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Client, HttpProvider } from '@defichain/jellyfish'
const container = new RegTestContainer()

const rpcURL = await container.getCachedRpcUrl()
const client = new Client(new HttpProvider(rpcURL))
```
