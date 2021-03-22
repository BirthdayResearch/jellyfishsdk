# @defichain/wallet-coin

BIP44 Hierarchical Deterministic Wallet CoinType-agnostic Implementation.

Following Purpose/CoinType/Account/Chain/Address as defined
in https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki

HdWallet implements Account/Chain/Address with auto discovery mechanism.

- Purpose is fixed to `44`, address format implementation is up to the node to implement.
- CoinType is initialized in the constructor, CoinType-agnostic.
- Account will be auto discovered.
- Chain is fixed to 0, change address implementation is ignored. (At least for now)
- Address will be auto discovered respecting gap limit of 20.
