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

## Testing

For testing accuracy and convenience. All implementations must be e2e tested on `@defichain/testcontainers`. Due to the
complexity of testing, `@defichain/jellyfish-api-jsonrpc` and `@defichain/testing` is included in `devDependencies` for
setting up and tearing down test fixtures.
