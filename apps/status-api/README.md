# DeFiChain Status API

DeFiChain Status API, providing the statuses of different DeFiChain services.


## Motivation
> https://github.com/DeFiCh/jellyfish/issues/1270

To decouple the DeFiChain products from the status page, the approach of having a centralised provider to determine each DeFiChain service status with a pre-defined logic will allow it to be maintained consistently throughout. This will allow other apps or services to share the status from the same Status APIs.

### `/blockchain`
>https://github.com/DeFiCh/jellyfish/issues/1271

To provide the status of the blockchain based on the block creation time interval

| Status             | Threshold Time    |
|--------------------|-------------------|
| `operational`      | `< 30 minutes`    |
| `degraded`         | `30 - 45 minutes` |
| `outage`           | `> 45 minutes`    |

### `/oracles/:address`

To provide the status of each oracle given the address based on the last published time for any given token


| Status             | Threshold Time   |
|--------------------|------------------|
| `operational`      | `<= 45 minutes`  |
| `outage`           | `> 45 minutes`   |

 
### `/overall`
>https://github.com/DeFiCh/jellyfish/issues/1274

To provide the aggregated status of all services required by Light Wallet & Scan (Blockchain & Ocean).

