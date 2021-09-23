---
id: net
title: Net API
sidebar_label: Net API
slug: /jellyfish-api-core/net
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

## getNetworkInfo

Returns an object containing various state info regarding P2P networking.

```ts title="client.net.getNetworkInfo()"
interface net {
  getNetworkInfo (): Promise<NetworkInfo>
}

interface NetworkInfo {
  version: number
  subversion: string
  protocolversion: number
  localservices: string
  localrelay: boolean
  timeoffset: number
  connections: number
  networkactive: boolean
  networks: Network[]
  relayfee: number
  incrementalfee: number
  localaddresses: LocalAddress[]
  warnings: string
}

interface Network {
  name: string
  limited: boolean
  reachable: boolean
  proxy: string
  proxy_randomize_credentials: boolean
}

interface LocalAddress {
  address: string
  port: number
  score: number
}
```
