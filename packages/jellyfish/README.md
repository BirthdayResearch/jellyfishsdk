# @defichain/jellyfish

Distributed as `@defichain/jellyfish` with all packages included.

- [ ] TODO(fuxingloh)

## @defichain/jellyfish-core

`@defichain/jellyfish-core` the protocol agnostic DeFiChain client implementation with APIs separated into their category. Client APIs are implemented categorically as follows:

### `client.'category'.'method'()`

|category|method|JS|CCP|
|---|---|---|---|
|mining|getmintinginfo|`client.mining.getMintingInfo()`|`rpc/mining.cpp#getmintinginfo`|
|rawtransaction|sendrawtransaction|`client.transaction.sendRawTransaction(tx)`|`rpc/sendrawtransaction.cpp#sendrawtransaction`|
