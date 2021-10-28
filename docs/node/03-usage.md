---
id: usage
title: Usage
sidebar_label: Usage
slug: /usage
---

## Installation

```shell
npm i defichain @defichain/jellyfish-api-jsonrpc
```

## JsonRpcClient

```ts
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

const client = new JsonRpcClient('http://foo:bar@localhost:8554')
```

## ApiClient

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

## `call` Method

You can use the `.call` method directly by specifying:

1. node rpc method name
2. payload params
3. number precision for parse

```ts
const result = await client.call('methodname', ['p1', 'p2'], 'number')
```
