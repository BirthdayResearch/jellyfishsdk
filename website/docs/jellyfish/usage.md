---
id: usage
title: Jellyfish usage
sidebar_label: Jellyfish usage
slug: /jellyfish/usage
---

## @defichain/jellyfish

### Installation

```shell
npm install @defichain/jellyfish
```

### ES6 Modules + TypeScript

```ts
import {Client, MiningInfo} from '@defichain/jellyfish'

const client = new Client('http://localhost:8554')
const info: MiningInfo  = await client.mining.getMiningInfo()
```

### CommonJS for Node

```js
const jellyfish = require('@defichain/jellyfish')
const client = new jellyfish.Client('http://localhost:8554', {
  timeout: 20000
})

client.mining.getMiningInfo().then((info) => {
  console.log(info)
})
```

### Providers

```js
import {Client, HttpProvider} from '@defichain/jellyfish'

const options = {} // optional

// TODO(fuxingloh): WIP, more coventional default will be introduced with convenience
const localClient = new Client(new HttpProvider('http://localhost:8554'), options)
```

## Advanced usage

### JsonRpcClient

You can use `@defichain/jellyfish-api-jsonrpc` directly without using `@defichain/jellyfish`.

```ts
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const client = new JsonRpcClient('http://foo:bar@localhost:8554')
```

### ApiClient

You can extend `ApiClient` with the `@defichain/jellyfish-api-core` package to create your own transport exchange specification.

```ts
import { ApiClient } from '@defichain/jellyfish-api-core'


class SpecClient extends ApiClient {
  async call<T> (method: string, payload: any[]): Promise<T> {
    throw new ClientApiError('error from client')
  }
}

const client = new SpecClient('http://localhost:8554')
```

### `call` Method

You can use the `.call` method directly by specifying:

1. node rpc method name
2. payload params
3. number precision for parse

```ts
const result = await client.call('methodname', ['p1', 'p2'], 'number')
```
