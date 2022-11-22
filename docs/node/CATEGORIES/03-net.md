---
id: net
title: Net API
sidebar_label: Net API
slug: /jellyfish/api/net
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

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
  addrbind?: string
  addrlocal?: string
  services: string
  relaytxes: boolean
  lastsend: number
  lastrecv: number
  bytessent: number
  bytesrecv: number
  conntime: number
  timeoffset: number
  pingtime?: number
  minping?: number
  pingwait?: number
  version: number
  subver: string
  inbound: boolean
  addnode: boolean
  startingheight: number
  banscore?: number
  synced_headers?: number
  synced_blocks?: number
  inflight: number[]
  whitelisted: boolean
  permissions: string[]
  minfeefilter: number
  bytessent_per_msg: {
    [msg: string]: number
  }
  bytesrecv_per_msg: {
    [msg: string]: number
  }
}
```

## getNetTotals

Returns information about network traffic, including bytes in, bytes out, and current time.

```ts title="client.net.getNetTotals()"
interface net {
  getNetTotals (): Promise<NetTotals>
}

interface NetTotals {
  totalbytesrecv: number
  totalbytessent: number
  timemillis: number
  uploadtarget: UploadTarget
}

interface UploadTarget {
  timeframe: number
  target: number
  target_reached: boolean
  serve_historical_blocks: boolean
  bytes_left_in_cycle: number
  time_left_in_cycle: number
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

## setNetworkActive

Disable/enable all p2p network activity.

```ts title="client.net.setNetworkActive()"
interface net {
  setNetworkActive (state: boolean): Promise<boolean>
}
```
