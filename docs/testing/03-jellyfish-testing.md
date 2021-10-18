---
id: jellyfish-testing
title: Jellyfish Testing
sidebar_label: Jellyfish Testing
slug: /jellyfish-testing
---

## What is `@defichain/jellyfish-testing`?

This package introduces a centralized testing framework for the jellyfish replacing the existing `@defichain/testing`.
All methods within `@defichain/testing` have thus been deprecated.

Testing is an essential part of any serious quality software developer work. This package provides many abstractions for
various commonly used setup patterns for the DeFi Blockchain. This keeps your testing setup DRY for repeated tests.

This new implementation warps a container on init via `Testing.create(container)` extending on top of rpc and container.

## Installation

Install as dev only as you don't need this in production. **Please don't use this in production!**

```shell
npm i -D @defichain/jellyfish-testing
```

## Usage

```ts
const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)

testing.rpc         // to access JSON RPC
testing.fixture     // for complex fixture setup e.g. poolpair
testing.rawtx       // for rawtx setup with reasonable defaults 
testing.token       // for token setup with reasonable defaults 
testing.poolpair    // for poolpair setup with reasonable defaults 
```

<details>

<summary>Usage within DeFiCh/jellyfish/packages</summary>

### Cyclic dependencies

`@defichain/jellyfish-testing` relies on other jellyfish dependencies, they are cyclic dependant. However, within this
mono-repo, we don't need to declare `"devDependencies"` as they are mapped in `tsconfig.base.json`. This configuration
allows any packages within `jellyfish-*` to rely on `jellyfish-testing` without causing cyclic dependencies errors.

</details>
