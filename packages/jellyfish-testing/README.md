[![npm](https://img.shields.io/npm/v/@defichain/jellyfish-testing)](https://www.npmjs.com/package/@defichain/jellyfish-testing/v/latest)

# @defichain/jellyfish-testing

Testing is an essential part of any serious quality software developer work. This package provides many abstractions for
various commonly used setup pattern for DeFi blockchain. This keeps your testing setup DRY for repeated tests.

## Development

Being a testing framework for jellyfish, JSDoc is optional as we are using TypeScript.

## Cyclic dependencies

`@defichain/jellyfish-testing` relies on other jellyfish dependencies, they are cyclic dependant. However, within this
mono-repo, we don't need to declare `"devDependencies"` as they are mapped in `tsconfig.base.json`. This configuration
allows any packages within jellyfish to rely on jellyfish-testing without causing cyclic dependencies.
