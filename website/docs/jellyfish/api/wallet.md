---
id: wallet
title: Wallet API
sidebar_label: Wallet API
slug: /jellyfish/api/wallet
---

```js
import {Client} from '@defichain/jellyfish'

const client = new Client()

// Using client.wallet.
const something = await client.wallet.method()
```

## getBalance

Returns the total available balance in wallet.

- `minimumConfirmation` to include transactions confirmed at least this many times.
- `includeWatchOnly` for watch-only wallets, otherwise
  - Include balance in watch-only addresses (see `importAddress`)

```ts title="client.wallet.getBalance()"
interface wallet {
  getBalance (minimumConfirmation: number = 0,
              includeWatchOnly: boolean = false): Promise<BigNumber>
}
```

## listUnspent

Get list of UTXOs in wallet.

```ts title="client.wallet.listUnspent()"
interface wallet {
  listUnspent (
    minimumConfirmation = 1,
    maximumConfirmation = 9999999,
    options: ListUnspentOptions = {},
  ): Promise<UTXO[]>
}

interface ListUnspentOptions {
  addresses?: string[]
  includeUnsafe?: boolean
  queryOptions?: ListUnspentQueryOptions
}

interface ListUnspentQueryOptions {
  minimumAmount?: number
  maximumAmount?: number
  maximumCount?: number
  minimumSumAmount?: number
  tokenId?: string
}

interface UTXO {
  txid: string
  vout: number
  address: string
  label: string
  scriptPubKey: string
  amount: BigNumber
  tokenId: number
  confirmations: number
  redeemScript: number
  witnessScript: number
  spendable: boolean
  solvable: boolean
  reused: string
  desc: string
  safe: boolean
}
```

## createWallet

Create a new wallet.

```ts title="client.wallet.createWallet()"
interface wallet {
  createWallet (walletName: string, disablePrivateKeys = false, options: CreateWalletOptions = {}): Promise<CreateWalletResult>
}

interface CreateWalletOptions {
  blank?: boolean
  passphrase?: string
  avoidReuse?: boolean
}

interface CreateWalletResult {
  name: string
  warning: string
}
```

## getTransaction

Get detailed information about in-wallet transaction

```ts title="client.wallet.getTransaction()"
interface wallet {
  getTransaction (txid: string, includeWatchOnly: boolean = true): Promise<InWalletTransaction>
}

interface InWalletTransaction {
  amount: number
  fee: number
  confirmations: number
  blockhash: string
  blockindex: number
  blocktime: number
  txid: string
  time: number
  timereceived: number
  bip125replaceable: BIP125
  details: WalletTransactionDetail[]
  hex: string
}

interface InWalletTransactionDetail {
  address: string
  category: WalletTransactionCategory
  amount: number
  label: string
  vout: number
  fee: number
  abandoned: boolean
}

enum BIP125 {
  YES = 'YES',
  NO = 'NO',
  UNKNOWN = 'UNKNOWN'
}

enum InWalletTransactionCategory {
  SEND = "SEND",
  RECEIVE = "RECEIVE",
  GENERATE = "GENERATE",
  IMMATURE = "IMMATURE",
  ORPHAN = "ORPHAN"
}
```

## getWalletInfo

Return object containing various wallet state info.

```ts title="client.wallet.getWalletInfo()"
interface wallet {
  getWalletInfo (): Promise<WalletInfo>
}

interface WalletInfo {
  walletname: string
  walletversion: number
  balance: BigNumber
  unconfirmed_balance: BigNumber
  immature_balance: BigNumber
  txcount: number
  keypoololdest: number
  keypoolsize: number
  keypoolsize_hd_internal: number
  unlocked_until: number
  paytxfee: BigNumber
  hdseedid: string
  private_keys_enabled: boolean
  avoid_reuse: boolean
  scanning: {
    duration: number
    progress: number
  }
}
```

## setWalletFlag

Change the state of the given wallet flag for a wallet.

```ts title="client.wallet.setWalletFlag()"
interface wallet {
  setWalletFlag (flag: WalletFlag, value: boolean = true): Promise<WalletFlagResult>
}

interface WalletFlagResult {
  flag_name: string
  flag_state: boolean
  warnings: string
}
```

## getNewAddress

Returns a new DeFi address for receiving payments. If 'label' is specified, it's added to the address book. So payments
received with the address will be associated with 'label'.

```ts title="client.wallet.getNewAddress()"
interface wallet {
  getNewAddress (label: string = '', addressType = AddressType.BECH32): Promise<string>
}
```

## validateAddress

Validate and return information about the given DFI address.

```ts title="client.wallet.validateAddress()"
interface wallet {
  validateAddress (address: string): Promise<ValidateAddressResult>
}

interface ValidateAddressResult {
  isvalid: boolean
  address: string
  scriptPubKey: string
  isscript: boolean
  iswitness: boolean
  witness_version: number
  witness_program: string
}
```

## getAddressInfo

Return information about the given address.

```ts title="client.wallet.getAddressInfo()"
interface wallet {
  getAddressInfo (address: string): Promise<AddressInfo>
}

interface AddressInfo {
  address: string
  scriptPubKey: string
  ismine: boolean
  iswatchonly: boolean
  solvable: boolean
  desc: string
  isscript: boolean
  ischange: true
  iswitness: boolean
  witness_version: number
  witness_program: string
  script: ScriptType
  hex: string
  pubkeys: string[]
  sigsrequired: number
  pubkey: string
  embedded: {
    address: string
    scriptPubKey: string
    isscript: boolean
    iswitness: boolean
    witness_version: number
    witness_program: string
    script: ScriptType
    hex: string
    sigsrequired: number
    pubkey: string
    pubkeys: string[]
  }
  iscompressed: boolean
  label: string
  timestamp: number
  hdkeypath: string
  hdseedid: string
  hdmasterfingerprint: string
  labels: Label[]
}

interface Label {
  name: string
  purpose: string
}
```

## sendToAddress

Send an amount to given address and return a transaction id.

```ts title="client.wallet.sendToAddress()"
interface wallet {
  sendToAddress (address: string, amount: number, options: SendToAddressOptions = {}): Promise<string>
}

interface SendToAddressOptions {
  comment?: string
  commentTo?: string
  subtractFeeFromAmount?: boolean
  replaceable?: boolean
  confTarget?: number
  estimateMode?: Mode
  avoidReuse?: boolean
}
```

## listAddressGroupings

List groups of addresses which have had their common ownership made public by common use as inputs or as the resulting
change in past transactions.

```ts title="client.wallet.listAddressGroupings()"
interface wallet {
  listAddressGroupings (): Promise<any[][][]>
}
```

## sendMany

Send given amounts to multiple given address and return a transaction id.

```ts title="client.wallet.sendMany()"
interface wallet {
  async

  sendMany (amounts: Record<string, number>, subtractfeefrom: string [] = [], options: SendManyOptions = {}): Promise<string>
}

interface SendManyOptions {
  comment?: string
  replaceable?: boolean
  confTarget?: number
  estimateMode?: Mode
}

enum Mode {
  UNSET = 'UNSET',
  ECONOMICAL = 'ECONOMICAL',
  CONSERVATIVE = 'CONSERVATIVE'
}
```

## dumpPrivKey

Reveals the private key corresponding to an address.

```ts title="client.wallet.dumpPrivKey()"
interface wallet {
  dumpPrivKey (address: string): Promise<string>
}
```

## importPrivKey

Adds a private key (as returned by dumpprivkey) to your wallet. Requires a new wallet backup.

```ts title="client.wallet.importPrivKey()"
interface wallet {
  importPrivKey (privkey: string, label: string = "", rescan: boolean = true): Promise<void>
}
```
