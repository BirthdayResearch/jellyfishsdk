---
id: wallet
title: Wallet API
sidebar_label: Wallet API
slug: /jellyfish/api/wallet
---

## getBalance

Returns the total available balance in wallet.
- `minimumConfirmation` to include transactions confirmed at least this many times.
- `includeWatchOnly` for watch-only wallets, otherwise
  - Include balance in watch-only addresses (see `importAddress`)

```ts
getBalance (minimumConfirmation: number = 0, includeWatchOnly: boolean = false): Promise<BigNumber>
```
