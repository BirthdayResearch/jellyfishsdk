# Using BitcoinJS for DeFiChain

## [Creating Raw Transaction with BitcoinJS](./example.mjs)

1. Generate a PrivateKey
2. Generating an Address from PrivateKey
3. Sign Raw Transaction
4. Broadcast Raw Transaction to Ocean APIs

**Dependencies:**

- `@defichain/jellyfish-network` for defichain network configuration
- `bitcoinjs-lib` for creating Transaction
- `ecpair` for ECC operation
- `tiny-secp256k1` for ECC operation

## Network chain parameters

You can get the network chain parameters from `@defichain/jellyfish-network` via `getNetworkBitcoinJsLib(network)`.

```js
import { getNetworkBitcoinJsLib } from '@defichain/jellyfish-network'
import * as bitcoin from 'bitcoinjs-lib'

const MainNet = getNetworkBitcoinJsLib('mainnet')
const TestNet = getNetworkBitcoinJsLib('testnet')
const RegTest = getNetworkBitcoinJsLib('regtest')

new bitcoin.Psbt({ network: MainNet })
// ...
```

Alternatively, if you don't want to add another dependencies to your stack, you can statically declare them:

```js
const MainNet = {
  messagePrefix: '\x15Defi Signed Message:\n',
  bech32: 'df',
  bip32: {
    public: 76067358,
    private: 76066276
  },
  pubKeyHash: 18,
  scriptHash: 90,
  wif: 128
}
```

```js
const TestNet = {
  messagePrefix: '\x15Defi Signed Message:\n',
  bech32: 'tf',
  bip32: {
    public: 70617039,
    private: 70615956
  },
  pubKeyHash: 15,
  scriptHash: 128,
  wif: 239
}
```

```js
const RegTest = {
  messagePrefix: '\x15Defi Signed Message:\n',
  bech32: 'bcrt',
  bip32: {
    public: 70617039,
    private: 70615956
  },
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
}
```

