---
id: misc
title: Misc API
sidebar_label: Misc API
slug: /jellyfish/api/misc
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

// Using client.misc.
const something = await client.misc.method()
```

# setMockTime

To dynamically change the time for testing. For Regtest only.

```ts title="client.misc.setMockTime()"
interface misc {
  setMockTime (ts: number): Promise<void>
}
```

# verifyMessage

Verify a signed message.

```ts title="client.misc.verifyMessage()"
interface misc {
  verifyMessage (address: string, signature: string, message: string): Promise<boolean>
}
```

# signMessageWithPrivKey

Sign a message with the private key of an address

```ts title="client.misc.signMessageWithPrivKey()"
interface misc {
  signMessageWithPrivKey (privkey: string, message: string): Promise<string>
}
```

# deriveAddresses

Derives one or more addresses corresponding to an output descriptor.

```ts title="client.misc.deriveAddresses()"
interface misc {
  deriveAddresses (descriptor: string, range?: number[]): Promise<string[]>
}
```