---
id: spv
title: Spv API
sidebar_label: Spv API
slug: /jellyfish/api/spv
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.spv.
const something = await client.spv.method()
```

## getNewAddress

Creates and adds a Bitcoin address to the SPV wallet.

```ts title="client.spv.getNewAddress()"
interface spv {
  getNewAddress (): Promise<string>
}
```
