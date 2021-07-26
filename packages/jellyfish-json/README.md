[![npm](https://img.shields.io/npm/v/@defichain/jellyfish-json)](https://www.npmjs.com/package/@defichain/jellyfish-json/v/latest)

# @defichain/jellyfish-json

`JellyfishJSON` allows parsing of JSON with `'lossless'`, `'bignumber'` and `'number'` numeric precision.

- `'lossless'` uses LosslessJSON that parses numeric values as LosslessNumber. With LosslessNumber, one can perform
  regular numeric operations, and it will throw an error when this would result in losing information.
- `'bignumber'` parse all numeric values as 'BigNumber' using bignumber.js library.
- `'number'` parse all numeric values as 'Number' and precision will be loss if it exceeds IEEE-754 standard.
- `'PrecisionPath'` provides path based precision mapping, specifying 'bignumber' will automatically map all Number in
  that path as 'bignumber'. Otherwise, it will default to number, This applies deeply.
