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

## createToken

Creates a token with given metadata.

```ts title="client.token.createToken()"
interface token {
  createToken (metadata: CreateTokenMetadata, utxos: UTXO[] = []): Promise<string>
}

interface CreateTokenMetadata {
  symbol: string
  name: string
  isDAT: boolean
  mintable: boolean
  tradeable: boolean
  collateralAddress: string
}

interface UTXO {
  txid: string
  vout: number
}
```

## updateToken

Updates a token with given metadata.

```ts title="client.token.updateToken()"
interface token {
  updateToken (token: string, metadata?: UpdateTokenMetadata): Promise<string>
}

interface UpdateTokenMetadata {
  symbol?: string
  name?: string
  isDAT?: boolean
  mintable?: boolean
  tradeable?: boolean
  finalize?: boolean
}
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
  ): Promise<TokenResult>
}

interface TokenResult {
  [id: string]: TokenInfo
}

interface TokenInfo {
  symbol: string
  symbolKey: string
  name: string
  decimal: BigNumber
  limit: BigNumber
  mintable: boolean
  tradeable: boolean
  isDAT: boolean
  isLPS: boolean
  finalized: boolean
  minted: BigNumber
  creationTx: string
  creationHeight: BigNumber
  destructionTx: string
  destructionHeight: BigNumber
  collateralAddress: string
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
  getToken (symbolKey: string): Promise<TokenResult>
}

interface TokenResult {
  [id: string]: TokenInfo
}

interface TokenInfo {
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
```

## mintTokens

Creates a transaction to mint tokens.

```ts title="client.token.mintTokens()"
interface token {
  mintTokens (payload: TokenRegexType, utxos: UTXO[] = []): Promise<string>
}

type TokenRegexType = `${number}@${string}`

interface UTXO {
  txid: string
  vout: number
}
```
