import { TestAccountProvider } from './account.mock'
import { TestNodeProvider } from './node.mock'
import { WalletAccount } from '../src'
import { OP_CODES } from '@defichain/jellyfish-transaction'

describe('provide different account', () => {
  const nodeProvider = new TestNodeProvider()
  const accountProvider = new TestAccountProvider([])

  it('should provide for 0', () => {
    const node = nodeProvider.derive('0')
    const account = accountProvider.provide(node)
    expect(account).toBeTruthy()
  })

  it('should provide for 0/0', () => {
    const node = nodeProvider.derive('0/0')
    const account = accountProvider.provide(node)
    expect(account).toBeTruthy()
  })
})

describe('WalletAccount: 0/0/0', () => {
  const nodeProvider = new TestNodeProvider()
  const accountProvider = new TestAccountProvider([
    'bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8'
  ])
  let account: WalletAccount

  beforeAll(() => {
    const node = nodeProvider.derive('0/0/0')
    account = accountProvider.provide(node)
  })

  it('getAddress should be bcrt1q...', async () => {
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8')
  })

  it('isActive should be active', async () => {
    const active = await account.isActive()
    expect(active).toStrictEqual(true)
  })
})

describe('get script', () => {
  const nodeProvider = new TestNodeProvider()
  const accountProvider = new TestAccountProvider([])

  it('should get script for 0', async () => {
    const node = nodeProvider.derive('0')
    const account = accountProvider.provide(node)
    expect(await account.getScript()).toStrictEqual({
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA_HEX_LE('df01eaac7d4f3e28cf3b8929590766d3559e7a69')
      ]
    })
  })

  it('should get script for 0/0', async () => {
    const node = nodeProvider.derive('0/0')
    const account = accountProvider.provide(node)
    expect(await account.getScript()).toStrictEqual({
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA_HEX_LE('938a24a531e4ee0fd4ea12f95058292ed8f3eed4')
      ]
    })
  })
})

it('address to script', () => {
  const nodeProvider = new TestNodeProvider()
  const accountProvider = new TestAccountProvider([])

  const node = nodeProvider.derive('0')
  const account = accountProvider.provide(node)
  expect(account.addressToScript('bcrt1qur2tmednr6e52u9du972nqvua60egwqkf98ps8')).toStrictEqual({
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_LE('e0d4bde5b31eb34570ade17ca9819cee9f943816')
    ]
  })
})

describe("WalletAccount: 44'/1129'/0'", () => {
  const nodeProvider = new TestNodeProvider()
  const accountProvider = new TestAccountProvider([])
  let account: WalletAccount

  beforeAll(() => {
    const node = nodeProvider.derive("44'/1129'/0'")
    account = accountProvider.provide(node)
  })

  it('should derive public key for account', async () => {
    const pubKey = await account.publicKey()
    expect(pubKey.length).toStrictEqual(33)
    expect(pubKey.toString('hex')).toStrictEqual('03331bde25ae763c3872effa39a7b104dfd072d43a956d1c40c0aff7ede5fb1578')
  })

  it('should derive private key for account', async () => {
    const privKey = await account.privateKey()
    expect(privKey.length).toStrictEqual(32)
    expect(privKey.toString('hex')).toStrictEqual('3434272f31313239272f30273434272f31313239272f30273434272f31313239')
  })

  it('should derive sign and verify for account', async () => {
    const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

    const signature = await account.sign(hash)
    expect(signature.toString('hex')).toStrictEqual('3044022015707827c1bdfabfdbabb8d82f35c2cbe7b8d2fc1388a692469fe04879e4938802202eaf2033fb1b2cd69b5039457c283b9c80f082a6732f5460b983eb6947ca21bd')

    const valid = await account.verify(hash, signature)
    expect(valid).toStrictEqual(true)
  })

  it('should signed transaction and fail because invalid for account', async () => {
    return await expect(async () => await account.signTx({
      version: 0,
      vin: [],
      vout: [],
      lockTime: 0
    }, [])
    ).rejects.toThrow()
  })
})
