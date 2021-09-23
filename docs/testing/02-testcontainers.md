---
id: testcontainers
title: Testcontainers
sidebar_label: Testcontainers
slug: /testcontainers
---

## What is testcontainers?

Similar to [testcontainers](https://www.testcontainers.org/) in the Java ecosystem, this package provides a lightweight,
throwaway instances of **regtest**, **testnet** or **mainnet** provisioned automatically in a Docker container.
`@defichain/testcontainers` encapsulate on top of the `defi/defichain` Docker image and directly interface with the
Docker REST API on your localhost.

With `@defichain/testcontainers`, it allows DeFiChain JS developers to:

1. End-to-end test applications without the hassle of setting up toolchain
2. Run parallel tests as port number and container are dynamically generated on demand
3. Supercharge your CI workflow; run locally, anywhere or CI (as long as it has Docker installed)
4. Quality and reliability to dApps on the DeFiChain JS ecosystem

## Installation

Install as dev only as you don't need this in production. **Please don't use this in production!**

```shell
npm i -D @defichain/testcontainers
```

## Containers

* `RegTestContainer` provides a defid node managed in Docker.
* `MasterNodeRegTestContainer` provides a pre-configured masternode with coins auto minting.
* You can use your favourite test runner and set it up as part of the test lifecycle.

### RegTest

```ts
import {RegTestContainer} from '@defichain/testcontainers'

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
    expect(result.chain).toStrictEqual('regtest')
  })
})
```

### MasterNodeRegTest

With `MasterNodeRegTestContainer`, you can run a preconfigured masternode with staking enabled to auto mint every
second. Additionally, you can use `waitForWalletCoinbaseMaturity` to wait for coinbase maturity for your minted coins 
to be spendable.

```js
import {MasterNodeRegTestContainer} from '@defichain/testcontainers'
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
      const info = await container.getMiningInfo()
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

`GenesisKeys` is provided as a reference to the Genesis masternodes used in regtest. The `owner` keys of the first 2 and last 2 `GenesisKeys` have Foundation Authorization, and can be used to test functionality that requires Foundation Authorization.

## Convenience methods

### getCachedRpcUrl

```js
const container = new RegTestContainer()

// they are dynmaically assigned to host, you can run multiple concurrent tests!
const rpcURL = await container.getCachedRpcUrl()
```

### call('method', [])

```js
const container = new RegTestContainer()

// raw calls
const {blocks} = await container.call('getmininginfo')
const address = await container.call('getnewaddress', ['label', 'legacy'])

// basic included methods
const count = await container.getBlockCount()
const info = await container.getMiningInfo()
const newAddress = await container.getNewAddress()
```


## Using with Full Node APIs

Instead of connecting to a full node binary, you can spin up containers with `@defichain/testcontainers`.
This allows you to run parallelizable and reproducible unit test with the strongly-typed jellyfish Full Node APIs.

```js
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

// Setting up the container & client
const container = new MasterNodeRegTestContainer()
const rpcURL = await container.getCachedRpcUrl()
const client = new JsonRpcClient(rpcURL)

// Getting your balance
const balance = await client.wallet.getBalance()
```
