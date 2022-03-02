---
id: dex-endpoints
title: DEX Endpoints
sidebar_label: DEX Endpoints
slug: /
---

# AMM DEXes API

## C1: Uniswap Sample

Endpoint: https://api.defichain.com/v1/listswaps

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
interface LegacyListYieldFarmingData {
  pools: LegacyListYieldFarmingPool[]
  provider: string
  provider_logo: string
  provider_URL: string
  tvl: number
  links: Array<{
    title: string
    link: string
  }>
}

interface LegacyListYieldFarmingPool {
  name: string
  pair: string
  pairLink: string
  logo: string
  poolRewards: string[]
  apr: number
  totalStaked: number
}
```
