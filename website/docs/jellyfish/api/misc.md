---
id: misc
title: Misc API
sidebar_label: Misc API
slug: /jellyfish/api/misc
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.misc.
const something = await client.misc.method()
```

# setMockTime

To dynamically change the time for testing.

```ts title="client.misc.setMockTime()"
  interface misc {
    setMockTime (ts: number): Promise<void>
  }
```
