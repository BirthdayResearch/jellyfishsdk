---
id: overview
title: Overview
sidebar_label: Overview
slug: /
---

## What is Full Node APIs?

DeFiChain Full Node APIs is an RPC is used by authenticated clients to connect to a running instance of `defid`. The 
clients issue commands to send transactions, get status, and a variety of other defi purposes. 
`@defichain/jellyfish-api-jsonrpc` implements `@defichain/jellyfish-api-core` 
with [`JSON-RPC 1.0`](https://www.jsonrpc.org/specification_v1) specification.

Written in TypeScript, `jellyfish-api-core` provides first-class citizen support for TypeScript with strongly typed 
interfaces of DeFi Blockchain RPC exchanges. Built using modern JavaScript approaches, it emphasises a 
**future-first developer experience** and backport for compatibility. The protocol-agnostic core enables independent 
communication protocols, allowing vendor-agnostic middleware adaptable to any needs.
