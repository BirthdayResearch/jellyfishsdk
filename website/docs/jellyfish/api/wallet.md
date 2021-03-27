---
id: wallet
title: Wallet API
sidebar_label: Wallet API
slug: /jellyfish/api/wallet
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.wallet.
const something = await client.wallet.method()
```

## getBalance

Returns the total available balance in wallet.
- `minimumConfirmation` to include transactions confirmed at least this many times.
- `includeWatchOnly` for watch-only wallets, otherwise
  - Include balance in watch-only addresses (see `importAddress`)

```ts title="client.wallet.getBalance()"
interface wallet {
  getBalance (minimumConfirmation: number = 0, 
              includeWatchOnly: boolean = false): Promise<BigNumber>   
}
```
