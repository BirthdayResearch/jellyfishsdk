---
id: jellyfish
title: Testcontainers + Jellyfish
sidebar_label: Testcontainers + Jellyfish
slug: /testcontainers/jellyfish
---

## Using with Jellyfish

```js
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Client, HttpProvider } from '@defichain/jellyfish'
const container = new RegTestContainer()

const rpcURL = await container.getCachedRpcUrl()
const client = new Client(new HttpProvider(rpcURL))
```
