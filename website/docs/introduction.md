---
id: introduction
title: Introduction
sidebar_label: Introduction
slug: /
---

## What is Jellyfish?

A collection of TypeScript + JavaScript tools and libraries for DeFi Blockchain developers to build decentralized 
finance on Bitcoin. Consisting of multiple packages with more to be added in the future, this JS library enable 
developers to develop decentralized applications on top of DeFi Blockchain that are modern, easy to use and easy to 
test.

Written in TypeScript, jellyfish provides first-class citizen support for TypeScript with strongly typed interfaces of
DeFi blockchain rpc exchanges. Built using modern JavaScript approaches, it emphasises a **future-first developer experience**
and backport for compatibility. The protocol-agnostic core enable independent communication protocols, allowing
vendor-agnostic middleware adaptable to any needs.

### Monorepo & packages 

As with all modern JavaScript projects, jellyfish follows a monorepo structure with its concerns separated. All packages
maintained in this repo are published with the same version tag and follows the `DeFiCh/ain` releases.

[![npm](https://img.shields.io/npm/v/@defichain/jellyfish)](https://www.npmjs.com/package/@defichain/jellyfish/v/latest)
[![npm@next](https://img.shields.io/npm/v/@defichain/jellyfish/next)](https://www.npmjs.com/package/@defichain/jellyfish/v/next)

Package                                            | Description 
---------------------------------------------------|-------------
`@defichain/jellyfish`                             | Library bundled usage entrypoint with conventional defaults for 4 bundles: umd, esm, cjs and d.ts
`@defichain/jellyfish-api-core`                    | A protocol agnostic DeFi Blockchain client interfaces, with a "foreign function interface" design.
`@defichain/jellyfish-api-jsonrpc`                 | Implements the [JSON-RPC 1.0](https://www.jsonrpc.org/specification_v1) specification for api-core.
`@defichain/jellyfish-crypto`                      | Cryptography operations for jellyfish, includes a simple 'secp256k1' EllipticPair.
`@defichain/jellyfish-json`                        | Allows parsing of JSON with 'lossless', 'bignumber' and 'number' numeric precision.
`@defichain/jellyfish-network`                     | Contains DeFi blockchain various network configuration for mainnet, testnet and regtest.
`@defichain/jellyfish-transaction`                 | Dead simple modern stateless raw transaction composer for the DeFi Blockchain.
`@defichain/jellyfish-transaction-builder`         | Provides a high-high level abstraction for constructing transaction ready to be broadcast for DeFi Blockchain.
`@defichain/jellyfish-wallet`                      | Jellyfish wallet is a managed wallet, where account can get discovered from an HD seed.
`@defichain/jellyfish-wallet-mnemonic`             | MnemonicHdNode implements the WalletHdNode from jellyfish-wallet; a CoinType-agnostic HD Wallet for noncustodial DeFi.
`@defichain/testcontainers`                        | Provides a lightweight, throw away instances for DeFiD node provisioned automatically in a Docker container.
`@defichain/testing`                               | Provides rich test fixture setup functions for effective and effortless testing.
