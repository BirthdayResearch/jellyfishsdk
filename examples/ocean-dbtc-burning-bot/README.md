# Ocean dBTC Burning Bot

> [DFIP 2201-A: Solving unbacked dBTC](https://github.com/DeFiCh/dfips/issues/101)

Part of DFIP 2201-A requirement; an automated wallet bot to burn dBTC.

This is a very simple dBTC burning bot that is deployed
on [df1qc8ptw6vc9588w6f53fvcjsjx0fntv3men407a9](https://defiscan.live/address/df1qc8ptw6vc9588w6f53fvcjsjx0fntv3men407a9)
address.

## Implementation

> BURN-DFI -> DFI Rewards -> BTC Swap -> BTC Burn

With a predefined [`main()`](./src/main.ts) as the entry function, this bot take all DFI accumulated from BURN-DFI pool
rewards (3.5% from BTC-DFI). Swapping them from DFI to BTC and then finally sending it to the burn
address `8defichainBurnAddressXXXXXXXdRQkSm`.

## Deployment

Deployed on AWS lambda, this bot is compiled with [vercel/ncc](https://github.com/vercel/ncc) via [build.js](./build.js)
which produce a single file that support TypeScript and binary addons (tiny-secp256k1).

```shell
npm i
npm run build

# Upload ./dist/main.zip into AWS Lambda
```
