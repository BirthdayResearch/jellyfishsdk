---
id: server
title: Server API
sidebar_label: Server API
slug: /jellyfish/api/server
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.server.
const something = await client.server.method()
```


## getRpcInfo

Returns details of the RPC server.
- `active_commands` a list of active commands
- `logpath` the complete path to the debug log

```ts title="client.server.getRpcInfo()"
interface server {
  getRpcInfo (): Promise<RpcInfo>
}

interface ActiveCommand {
  method: string
  duration: number
}

interface RpcInfo {
  active_commands: ActiveCommand[]
  logpath: string
}
```
