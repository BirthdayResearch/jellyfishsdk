---
id: dex
title: AMM DEX API
sidebar_label: AMM DEX API
slug: /dex
---

# AMM DEXes API

## C1: Uniswap Sample

Endpoint: https://api.defichain.com/v2/listswaps

:::caution DEPRECATED `/v1/listswaps`

On the previous version of `/v1/listswaps`; `last_price` was mistakenly inverted.
**`/v2/listswaps` is the corrected version.** `/v1/listswaps` has been deprecated but will still be supported.

:::

Query params:

* network: mainnet (default) / testnet

Sample output:
```json
{
  "ETH_DFI": {
    "base_id": "1",
    "base_name": "Ether",
    "base_symbol": "ETH",
    "quote_id": "0",
    "quote_name": "Default Defi token",
    "quote_symbol": "DFI",
    "last_price": "1014.38963182",
    "base_volume": "*",
    "quote_volume": "*"
  },
  "BTC_DFI": {
    "base_id": "2",
    "base_name": "Bitcoin",
    "base_symbol": "BTC",
    "quote_id": "0",
    "quote_name": "Default Defi token",
    "quote_symbol": "DFI",
    "last_price": "34734.50763876",
    "base_volume": "*",
    "quote_volume": "*"
  },
  "USDT_DFI": {
    "base_id": "3",
    "base_name": "Tether USD",
    "base_symbol": "USDT",
    "quote_id": "0",
    "quote_name": "Default Defi token",
    "quote_symbol": "DFI",
    "last_price": "1.60368329",
    "base_volume": "*",
    "quote_volume": "*"
  }
}
```

##### TypeScript Definitions

```typescript
interface LegacyListSwapsResponse {
  [key: string]: LegacySwapData
}

interface LegacySwapData {
  base_id: string
  base_name: string
  base_symbol: string
  quote_id: string
  quote_name: string
  quote_symbol: string
  last_price: string
  base_volume: number
  quote_volume: number
  isFrozen: 0 | 1
}
```

## C2: Subgraph Sample

Endpoint: https://api.defichain.com/v1/getsubgraphswaps

Query params:

* network: mainnet (default) / testnet
* limit: the number of swaps to receive. Default is 30 which is also the maximum.
* next: next cursor token, provided by response for pagination

Sample output:
```json
{
    "data": {
        "swaps": [
            {
                "id": "0187bf0e1ec6a292f1a216faca1e17f9cb970423c84c0424ac4f370124e64716",
                "timestamp": "1646642458",
                "from": {
                    "amount": "10000.00000000",
                    "symbol": "DUSD"
                },
                "to": {
                    "amount": "2883.39414293",
                    "symbol": "DFI"
                }
            },
            {
                "id": "4ce4310a28ba7883a989064fba09ed9a10a7583fe8899f5cacbdac6b893bb914",
                "timestamp": "1646642458",
                "from": {
                    "amount": "50.00000000",
                    "symbol": "AAPL"
                },
                "to": {
                    "amount": "9298.05805564",
                    "symbol": "DUSD"
                }
            },
            {
                "id": "3087d17306b9fa6ad8128cf61bbb51a3b895adaddb477a7771d94256a838ed3c",
                "timestamp": "1646642458",
                "from": {
                    "amount": "111.52051200",
                    "symbol": "DUSD"
                },
                "to": {
                    "amount": "2.30706309",
                    "symbol": "EEM"
                }
            }
        ]
    },
    "page": {
        "next": "eyJoZWlnaHQiOiIxNjg1OTE2Iiwib3JkZXIiOiI1NyJ9"
    }
}
```

##### TypeScript Definitions

```typescript
interface SubgraphSwapsResponse {
  data: {
    swaps: SubgraphSwap[]
  }
  page?: {
    next: string
  }
}

interface SubgraphSwap {
  id: string
  timestamp: string
  from: SubgraphSwapFromTo
  to: SubgraphSwapFromTo
}

interface SubgraphSwapFromTo {
  amount: string
  symbol: string
}
```

## C3: Yield Farming Sample

Endpoint: https://api.defichain.com/v1/listyieldfarming

Query params:
* network: mainnet (default) / testnet

Sample output:
```json
{
  "pools": [
    {
      "apr": 357.40539908693245,
      "name": "Ether-Default Defi token",
      "pair": "ETH-DFI",
      "logo": "https://defichain.com/downloads/symbol-defi-blockchain.svg",
      "poolRewards": [
        "DFI"
      ],
      "totalStaked": 1660911.530270244,
      "pairLink": "https://dex.defichain.com/mainnet/pool/4"
    },
    {
      "apr": 401.1516191325137,
      "name": "Bitcoin-Default Defi token",
      "pair": "BTC-DFI",
      "logo": "https://defichain.com/downloads/symbol-defi-blockchain.svg",
      "poolRewards": [
        "DFI"
      ],
      "totalStaked": 12578185.205055784,
      "pairLink": "https://dex.defichain.com/mainnet/pool/5"
    },
    {
      "apr": 365.635294364571,
      "name": "Tether USD-Default Defi token",
      "pair": "USDT-DFI",
      "logo": "https://defichain.com/downloads/symbol-defi-blockchain.svg",
      "poolRewards": [
        "DFI"
      ],
      "totalStaked": 811763.4668665677,
      "pairLink": "https://dex.defichain.com/mainnet/pool/6"
    }
  ],
  "provider": "Defichain",
  "provider_logo": "https://defichain.com/downloads/symbol-defi-blockchain.svg",
  "provider_URL": "https://defichain.com",
  "links": [
    { "title": "Twitter", "link": "https://twitter.com/defichain" },
    { "title": "YouTube", "link": "https://www.youtube.com/DeFiChain" },
    { "title": "Reddit", "link": "https://reddit.com/r/defiblockchain" },
    { "title": "Telegram", "link": "https://t.me/defiblockchain" },
    { "title": "LinkedIn", "link": "https://www.linkedin.com/company/defichain" },
    { "title": "Facebook", "link": "https://www.facebook.com/defichain.official" },
    { "title": "GitHub", "link": "https://github.com/DeFiCh" },
    { "title": "Discord", "link": "https://discord.com/invite/py55egyaGy" }
  ]
}
```

##### TypeScript Definitions

```typescript
interface ListYieldFarmingData {
  pools: ListYieldFarmingPool[]
  provider: string
  provider_logo: string
  provider_URL: string
  tvl: number
  links: Array<{
    title: string
    link: string
  }>
}

interface ListYieldFarmingPool {
  name: string
  pair: string
  pairLink: string
  logo: string
  poolRewards: string[]
  apr: number
  totalStaked: number
}
```
