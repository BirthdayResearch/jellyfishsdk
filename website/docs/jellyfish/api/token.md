---
id: token
title: Token API
sidebar_label: Token API
slug: /jellyfish/api/token
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.token.
const something = await client.token.method()
```

## listTokens

Returns information about tokens.

```ts title="client.token.listTokens()"
interface token {
  listTokens (
    pagination: TokenPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true
  ): Promise<IToken>
}

interface IToken {
  [id: string]: {
    symbol: string
    symbolKey: string
    name: string
    decimal: number
    limit: number
    mintable: boolean
    tradeable: boolean
    isDAT: boolean
    isLPS: boolean
    finalized: boolean
    minted: number
    creationTx: string
    creationHeight: number
    destructionTx: string
    destructionHeight: number
    collateralAddress: string
  }
}

interface TokenPagination {
  start: number
  including_start: boolean
  limit: number
}
```

## getToken

Returns information about token.

```ts title="client.token.getToken()"
interface token {
  getToken (symbol: string): Promise<IToken>
}
```