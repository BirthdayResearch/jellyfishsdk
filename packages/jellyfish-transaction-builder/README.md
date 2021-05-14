[![npm](https://img.shields.io/npm/v/@defichain/jellyfish-transaction-builder)](https://www.npmjs.com/package/@defichain/jellyfish-transaction-builder/v/latest)
[![npm@next](https://img.shields.io/npm/v/@defichain/jellyfish-transaction-builder/next)](https://www.npmjs.com/package/@defichain/jellyfish-transaction-builder/v/next)

# @defichain/jellyfish-transaction-builder

While jellyfish-transaction provides a dead simple, modern, stateless raw transaction builder for DeFi. Constructing a
trust-less crypto transaction from scratch still has certain complexity as with the nature of blockchain technologies.
This package `jellyfish-transaction-builder` provides a high-high level abstraction for constructing transaction ready
to be broadcast for DeFi Blockchain.

What can `jellyfish-transaction-builder` do?

1. Uses low-level `jellyfish-*` packages for creating transaction.
2. Construct signed segwit transaction ready for broadcasting
3. Construct DeFi custom transaction
4. Lastly, provides a simple developer experience for creating signed transaction.
