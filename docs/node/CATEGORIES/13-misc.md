---
id: misc
title: Misc API
sidebar_label: Misc API
slug: /jellyfish/api/misc
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

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
