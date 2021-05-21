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
      { code: 0, type: 'OP_0' },
      { hex: 'e0d4bde5b31eb34570ade17ca9819cee9f943816', type: 'OP_PUSHDATA' }
    ]
  })
})
