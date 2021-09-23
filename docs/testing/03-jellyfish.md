---
id: jellyfish
title: Testcontainers + Jellyfish
sidebar_label: Testcontainers + Jellyfish
slug: /jellyfish
---

## Using with Jellyfish

You can use jellyfish with testcontainers. 
Instead of connecting to a mainnet node, you can spin up regtest containers with `@defichain/testcontainers`.
This allows you to run parallelizable and reproducible unit test with the strongly-typed jellyfish APIs.  

```js
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Client, HttpProvider } from '@defichain/jellyfish'
const container = new RegTestContainer()

const rpcURL = await container.getCachedRpcUrl()
const client = new Client(new HttpProvider(rpcURL))
```
