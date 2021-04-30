[![npm](https://img.shields.io/npm/v/@defichain/testcontainers)](https://www.npmjs.com/package/@defichain/testcontainers/v/latest)
[![npm@next](https://img.shields.io/npm/v/@defichain/testcontainers/next)](https://www.npmjs.com/package/@defichain/testcontainers/v/next)

# @defichain/testcontainers

Similar to [testcontainers](https://www.testcontainers.org/) in the Java ecosystem, this package provides a lightweight,
throwaway instances of `regtest`, `testnet` or `mainnet` provisioned automatically in Docker container.
`@defichain/testcontainers` encapsulate on top of `defi/defichain:v1.x` and directly interface with the Docker REST API.

With `@defichain/testcontainers`, it allows the JS developers to:

1. End-to-end test their application without hassle of setting up the toolchain
2. Run parallel tests as port number and container are dynamically generated on demand
3. Supercharge our CI workflow; run locally, anywhere or CI (as long as it has Docker installed)
4. Supercharge your `@defichain/jellyfish` implementation with 100% day 1 compatibility (mono repo!)
5. Bring quality and reliability to dApps on the DeFiChain JS ecosystem

## Usage Example

Install as dev only as you don't need this in production. **Please don't use this in production!**

```shell
npm i -D @defichain/testcontainers
```

Use your favourite jest runner and start building dApps!

### Basic `RegTestContainer` setup

```js
import { RegTestDocker } from '@defichain/testcontainers'

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

### `MasterNodeRegTestContainer` with auto-minting

```js
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import waitForExpect from "wait-for-expect";

describe('master node pos minting', () => {
  const container = new MasterNodeRegTestContainer()

  beforeEach(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should wait until coinbase maturity with spendable balance', async () => {
    await container.generate(100)

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

### Endpoint?

```js
const container = new MasterNodeRegTestContainer()
const rpcURL = await container.getCachedRpcUrl()

// they are dynmaically assigned to host, you can run multiple concurrent tests!
const port = await container.getPort('8555/tcp')
```

### Included `container.call('method', [])` for convenience RPC calls

```js
const container = new MasterNodeRegTestContainer()
await container.start()
await container.waitForReady()

// raw universal calls
const { blocks } = await container.call('getmintinginfo')
const address = await container.call('getnewaddress', ['label', 'legacy'])

// basic included types
const count = await container.getBlockCount()
const info = await container.getMintingInfo()
const newAddress = await container.getNewAddress()
```
