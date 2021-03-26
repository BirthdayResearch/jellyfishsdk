[![npm](https://img.shields.io/npm/v/@defichain/jellyfish)](https://www.npmjs.com/package/@defichain/jellyfish/v/latest)
[![npm@next](https://img.shields.io/npm/v/@defichain/jellyfish/next)](https://www.npmjs.com/package/@defichain/jellyfish/v/next)

# @defichain/jellyfish

This is the entrypoint for most dApp developer. Distributed as `@defichain/jellyfish`, it bundles and creates 4 types of
JavaScript packages for public use.

This package provides conventional defaults and bundle all code required for dApps building. For library consumer, it is
just "plug and play", they don't need to care how it works underneath.

1. `dist/jellyfish.cjs.js` for node.js
1. `dist/jellyfish.umd.js` for browser
1. `dist/jellyfish.esm.js` for ES6 module
1. `dist/jellyfish.d.ts` for TypeScript definitions
