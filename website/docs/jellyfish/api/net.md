---
id: net
title: Net API
sidebar_label: Net API
slug: /jellyfish/api/net
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.net.
const something = await client.net.method()
```

## getConnectionCount

Returns the number of connections to other nodes.

```ts title="client.net.getConnectionCount()"
interface net {
  getConnectionCount (): Promise<number>
}
```
