# @defichain/jellyfish-api-jsonrpc

`@defichain/jellyfish-api-jsonrpc` implements `@defichain/jellyfish-api-core`
with [`JSON-RPC 1.0`](https://www.jsonrpc.org/specification_v1) specification.

Other than `jellyfish-api-core`, 2 other external dependencies are used with 4 deeply.

1. `cross-fetch` for an isomorphic fetch client compatible with RN, Node & browser.
   1. `node-fetch`
2. `abort-controller` for fetch abort signal implementation for request timeout.
   1. `event-target-shim`

## Development & Testing

As all RPC interfacing is implemented in `jellyfish-api-core`, this package development & testing only focus on the
[JSON-RPC 1.0](https://www.jsonrpc.org/specification_v1) specification implementation.
