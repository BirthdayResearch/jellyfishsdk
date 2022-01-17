# Ocean DEX Trading Bot

Ocean DEX trading bot, this is a very simple bot that takes all `dUSDT` and convert them into `dDOGE`.

## Technical Design

This Program assumes you always have enough UTXO. Only Account balances is used for trading. This bot just trades all
dUSDT it has into dDOGE, no conditional logic is performed. You need to implement them yourself.

## Deployment

Deployable on AWS lambda, this bot is compiled with [vercel/ncc](https://github.com/vercel/ncc) which produce a single
file that support TypeScript and binary addons (tiny-secp256k1). You are not required to deploy this on AWS lambda, it
can simply be deployed as a NodeJS program.

```shell
npm i
npm run build

# Upload ./dist/main.zip into AWS Lambda
```
