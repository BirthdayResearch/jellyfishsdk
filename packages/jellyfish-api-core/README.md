[![npm](https://img.shields.io/npm/v/@defichain/jellyfish-api-core)](https://www.npmjs.com/package/@defichain/jellyfish-api-core/v/latest)

# @defichain/jellyfish-api-core

`@defichain/jellyfish-api-core` is a protocol agnostic DeFiChain client implementation with APIs separated into their
category.

## Features

* `Promise<T>` first implementation to prevent callback hell.
* Numeric precision aware JSON parsing with options of `lossless`, `bignumber` or `number`.
* Implementation in TypeScript with strongly typed interfaces and exported as `*.d.ts` too.
* Raw RPC call is available with `client.call('getbalance', [], 'bignumber')`

### Usage Example

```js
const result = await client.mining.getMiningInfo()
// or
client.mining.getMiningInfo().then((result) => {
  console.log(result)
}).catch((err) => {
  console.log('panic!')
}).finally(() => {
  console.log('cleanup')
})
```

## Development

`ApiClient` being an abstract class allows the ability to adapt to any protocol when introduced (e.g. ws, https)
while being simple to use. This implementation structure can be observed in ContainerAdapterClient where it is used to
test jellyfish-api-core implementations.

RPC categories are grouped into `jellyfish-api-core/src/category/*.ts` (e.g. `category/mining.ts`) this allows a
protocol agnostic implementation of the RPC. All concerns are grouped within one `ts` file for better developer
experience of browsing and maintaining the code.

`ApiError` encapsulate RPC errors from DeFiChain within a structure. This allows for `instanceof` or type of error
handling with rich structure.

`JellyfishJSON` allows parsing of JSON with 'lossless', 'bignumber' and 'number' numeric precision.

* **'lossless'** uses LosslessJSON that parses numeric values as LosslessNumber. With LosslessNumber, one can perform
  regular numeric operations, and it will throw an error when this would result in losing information.
* **'bignumber'** parse all numeric values as 'BigNumber' using bignumber.js library.
* **'number'** parse all numeric values as 'Number' and precision will be loss if it exceeds IEEE-754 standard.
* **'PrecisionPath'** provides path based precision mapping, specifying 'bignumber' will automatically map all Number in
  that path as 'bignumber'. Otherwise, it will default to number, This applies deeply.

## Testing

```shell
jest
```

As the RPC is implemented on `jellyfish-api-core`, all testing of RPC implementation should be done
on `jellyfish-api-core`. `ContainerAdapterClient` is created to facilitate testing via an adapter implementation with
all RPCs proxied into a `@defichain/testcontainers`.
