# @defichain/jellyfish-wallet

> If you want to use multiple/change address please use defid directly.
> This is created for better UX, your daily average users.

Jellyfish wallet is a managed wallet, where account can get discovered from an HD seed. Accounts in jellyfish-wallet,
has only one address for simplicity. Accounts path are derived from seed with path: `{ACCOUNT}/0/0`. Non-hardened path
is used to allow encrypted wallet implementation where only xpubkey is required. It uses a provider model where the node
and account is agnostic and provided on demand to the managed wallet.

Being a managed wallet design it uses must use conventional defaults and options must be kept to none. Address must stay
consistent hence `bech32` must be used and, etc.

### Wallet Hd Node

> `WalletHdNode` & `WalletHdNodeProvider`

A bip32 path based hierarchical deterministic node, using a provider model where you can derive any HdNode.
`WalletHdNode` extends `EllipticPair` in the jellyfish-crypto package with the additional interface `signTx()` for
signing transaction.

Due to the agnostic and promise based nature of WalletHdNode, it allows any implementation from hardware to network
based crypto operations.

### Wallet Account

> `WalletAccount` & `WalletAccountProvider`

Account in `jellyfish-wallet` provides an interface for all features of DeFi Blockchain. This pushes the implementation
design to WalletAccount implementor. This also allows for upstream agnostic implementation. It could be full node, super
node, or a networked API. 
