---
id: overview 
title: Ocean REST API 
sidebar_label: Overview 
slug: /
---

:::info BETA API v0 & beyond

Ocean REST API is currently in public BETA, all endpoint is prefixed with `/v0`. As part of
[DeFiCh/jellyfish#580](https://github.com/DeFiCh/jellyfish/issues/580) consolidation effort to creating better 
development synergy, `/v1` of the API is undergoing redesign and will look very different from `/v0`. 
`/v0` of the API is **used in production by `DeFiCh/wallet` and `DeFiCh/scan`**, the API will be long-lived with 
frequent incremental change with backward compatibility.

:::

## What is Ocean REST API?

Ocean REST API is a global infrastructure project hosted by DeFiChain to simplify building decentralized light 
applications. Powered by the Jellyfish Ecosystem, it features a super index that extends the capability of `defid`. The 
project is currently housed in [DeFiCh/whale](https://github.com/DeFiCh/whale), they are getting consolidated into 
`DeFiCh/jellyfish` as a single monorepo project.

Ocean Nodes are globally distributed around the world, any API request is served by the node nearest to the requester 
with auto fail-over.

## How to use Ocean REST API?

```
https://ocean.defichain.com/{version}/{network}
https://ocean.defichain.com/v0/mainnet
```

All API access is over HTTPS, and accessed from https://ocean.defichain.com. All data is sent and received as JSON.
Multiple versions of the API are deployed at any time (e.g. /v0.14), we highly encourage you use /v0 of Ocean REST API 
at all times.

```http request
GET https://ocean.defichain.com/v0/mainnet/stats

HTTP/1.1 200 OK
Date: Fri, 19 Nov 2021 00:00:00 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 804
Connection: keep-alive
vary: Origin
access-control-allow-origin: *

{
  "data": {
    ...
  }
}
```

### JS/TS Library

A full mapped JavaScript library 
[@defichain/whale-api-client](https://www.npmjs.com/package/@defichain/whale-api-client) with rich TypeScript 
definitions is provided for each release.

```shell
npm i @defichain/whale-api-client
```

```ts
import { WhaleApiClient } from '@defichain/whale-api-client'

const client = new WhaleApiClient({
  url: 'https://ocean.defichain.com',
  timeout: 60000,
  version: 'v0',
  network: 'mainnet'
})

client.stats.get().then((data) => {
  console.log(data)
})
```
