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

## Stats Sample

Endpoint: https://api.defichain.com/v1/stats

Query params:
* network: mainnet (default) / testnet
* q: json path to get the nested json object or value, e.g. "burnInfo" or "burnInfo.address"

Sample output:
```json
{
  "chain": "main",
  "blockHeight": 1673417,
  "bestBlockHash": "86c43ac7fa5d3dd1961dfd1686e01cde735cf7b80f1e3ec878b118d6844bc5ba",
  "difficulty": "13089393229.38818",
  "medianTime": 1646276485,
  "burnInfo": {
    "address": "8defichainBurnAddressXXXXXXXdRQkSm",
    "amount": "156002224.91060823",
    "tokens": [
      "7260.95539278@DFI",
      "6550.00000000@ETH",
      "2476.86380002@BTC",
      "18232000.00000000@USDT",
      "16820000.00000000@DOGE",
      "19051.00000000@LTC",
      "3131.00000000@BCH",
      "9850000.00000000@USDC"
    ],
    "feeburn": 232464,
    "auctionburn": 437231.10787029,
    "paybackburn": "34601648.85294260",
    "dexfeetokens": [
      "14.59099737@BTC",
      "354765.08706207@DUSD"
    ],
    "dfipaybackfee": 343912.73555533,
    "dfipaybacktokens": [
      "117275786.33108674@DUSD"
    ],
    "emissionburn": "77525134.89072141"
  },
  "tokens": {
    "max": 1200000000,
    "supply": {
      "total": 763742665.1929296,
      "circulation": 495163548.19201285,
      "foundation": 0,
      "community": 24733560.03724362
    },
    "initDist": {
      "total": 588000000,
      "totalPercent": 49,
      "foundation": 288120000,
      "foundationPercent": 49,
      "circulation": 49,
      "circulationPercent": 51
    }
  },
  "rewards": {
    "anchorPercent": 0.05,
    "liquidityPoolPercent": 22.5,
    "communityPercent": 9.95,
    "anchorReward": 0.1,
    "liquidityPool": 45,
    "total": 275.73744758,
    "minter": 91.90329127841399,
    "masternode": 91.90329127841399,
    "community": 13.538708676177999,
    "anchor": 0.055147489516,
    "liquidity": 70.17518040911,
    "options": 27.242859820904,
    "unallocated": 4.770257843134,
    "swap": 34.026001031372,
    "futures": 34.026001031372
  },
  "listCommunities": {
    "AnchorReward": 60.44163808,
    "Burnt": "77525134.89072141"
  },
  "timeStamp": 1646276619502
}
```

```typescript

interface LegacyStats {
  chain: string
  blockHeight: number
  bestBlockHash: string
  difficulty: string
  medianTime: number
  burnInfo: LegacyBurnInfo
  timeStamp: number
  tokens: LegacyTokens
  rewards: LegacyRewards
  listCommunities: LegacyListCommunities
}

interface LegacyBurnInfo {
  address: string
  amount: string
  tokens: string[]
  feeburn: number
  auctionburn: number
  paybackburn: string
  dexfeetokens: string[]
  dfipaybackfee: number
  dfipaybacktokens: string[]
  emissionburn: string
}

interface LegacyTokens {
  max: number
  supply: LegacySupply
  initDist: LegacyInitDist
}

interface LegacySupply {
  total: number
  circulation: number
  foundation: number
  community: number
}

interface LegacyInitDist {
  total: number
  totalPercent: number
  foundation: number
  foundationPercent: number
  circulation: number
  circulationPercent: number
}

interface LegacyRewards {
  anchorPercent: number
  liquidityPoolPercent: number
  communityPercent: number
  total: number
  community: number
  minter: number
  anchorReward: number
  liquidityPool: number
  masternode: number
  anchor: number
  liquidity: number
  swap: number
  futures: number
  options: number
  unallocated: number
}

interface LegacyListCommunities {
  AnchorReward: number
  Burnt: string
}
```
