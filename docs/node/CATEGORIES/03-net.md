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

## getPeerInfo

Returns data about each connected network node as a json array of objects.

```ts title="client.net.getPeerInfo()"
interface net {
  getPeerInfo (): Promise<PeerInfo[]>
}

export interface PeerInfo {
  id: number
  addr: string
  addrbind: string
  addrlocal: string
  services: string
  relaytxes: boolean
  lastsend: number
  lastrecv: number
  bytessent: number
  bytesrecv: number
  conntime: number
  timeoffset: number
  pingtime: number
  minping: number
  pingwait: number
  version: number
  subver: string
  inbound: boolean
  addnode: boolean
  startingheight: number
  banscore: number
  synced_headers: number
  synced_blocks: number
  inflight: number[]
  whitelisted: boolean
  permissions: string[]
  minfeefilter: number
  bytessent_per_msg: Record<string, number>
  bytesrecv_per_msg: Record<string, number>
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
