---
id: overview
title: Overview
sidebar_label: Overview
slug: /jellyfish
---

## What is jellyfish?

Jellyfish is a JS library written to enable developers to develop decentralized applications on top of DeFiChain. As
with all modern JavaScript projects, jellyfish follows a monorepo structure with its concerns separated. All packages
maintained in this repo are published with the same version tag and follows the `DeFiCh/ain` releases.

- **jellyfish** is the entrypoint for most dApps developer as it bundles and create 4 types of JavaScript modules:
  cjs, esm, umd and d.ts.
- **jellyfish-api-core** represents a protocol agnostic interface of DeFiChain client with APIs separated into their
  category.
- **jellyfish-api-jsonrpc** implements the api-core with the JSON-RPC 1.0 specification.

Written in TypeScript, jellyfish provides first-class citizen support for TypeScript with strongly typed interfaces of
DeFiChain rpc exchanges. Built using modern JavaScript approaches, it emphasises a **future-first developer experience** 
and backport for compatibility. The protocol-agnostic core enable independent communication protocols, allowing
vendor-agnostic middleware adaptable to any needs.
