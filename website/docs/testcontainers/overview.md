---
id: overview
title: Testcontainers Overview
sidebar_label: Overview
slug: /testcontainers
---

## What is testcontainers?

Similar to [testcontainers](https://www.testcontainers.org/) in the Java ecosystem, this package provides a lightweight,
throwaway instances of **regtest**, **testnet** or **mainnet** provisioned automatically in a Docker container.
`@defichain/testcontainers` encapsulate on top of the `defi/defichain` Docker image and directly interface with the
Docker REST API on your localhost.

With `@defichain/testcontainers`, it allows DeFiChain JS developers to:

1. End-to-end test applications without the hassle of setting up toolchain
2. Run parallel tests as port number and container are dynamically generated on demand
3. Supercharge your CI workflow; run locally, anywhere or CI (as long as it has Docker installed)
4. Quality and reliability to dApps on the DeFiChain JS ecosystem
