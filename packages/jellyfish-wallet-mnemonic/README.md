# @defichain/jellyfish-wallet-mnemonic

MnemonicHdNode implements the WalletHdNode from jellyfish-wallet. HdNode implementations is purpose and derivation
agnostic.

### Prior-art:

- BIP32 Hierarchical Deterministic Wallets
- BIP39 Mnemonic code for generating deterministic keys
- BIP44 Multi-Account Hierarchy for Deterministic Wallets

### #555 Broke Compatibility with BIP32

> https://github.com/DeFiCh/jellyfish/pull/555

In [#555](https://github.com/DeFiCh/jellyfish/pull/555) a significant change was done to
"@defichain/jellyfish-wallet-mnemonic". Part of the BIP32 specification literature defines the use of HMAC-SHA512.
`"Calculate I = HMAC-SHA512(Key = "Bitcoin seed", Data = S)"`. The `Key` in this implementation was updated
to `"@defichain/jellyfish-wallet-mnemonic"`. Although a novel idea at that time, this, unfortunately, created
incompatibilities with other 24-word providers.

Detailed in this issue https://github.com/DeFiCh/wallet/issues/726, where one explores a conscious bank owner that takes
extra measures to guarantee the safety of his assets. A large part of the change was motivated by that narrative,
although that narrative comes from the best intention of the developer for the safety of users' funds. Many users see it
as an annoyance more than anything else.

twenty-twenty hindsight

