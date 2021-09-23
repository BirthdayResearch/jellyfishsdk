---
id: misc
title: Misc API
sidebar_label: Misc API
slug: /jellyfish-api-core/misc
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.misc.
const something = await client.misc.method()
```

# setMockTime

To dynamically change the time for testing. For Regtest only.

```ts title="client.misc.setMockTime()"
interface misc {
  setMockTime (ts: number): Promise<void>
}
```
