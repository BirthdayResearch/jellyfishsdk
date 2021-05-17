import { TestAccountProvider } from './account.mock'
import { TestNodeProvider } from './node.mock'
import { WalletAccount } from '../src'

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
    expect(address).toBe('bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8')
  })

  it('isActive should be active', async () => {
    const active = await account.isActive()
    expect(active).toBe(true)
  })
})

describe('get script', () => {
  const nodeProvider = new TestNodeProvider()
  const accountProvider = new TestAccountProvider([])

  it('should get script for 0', async () => {
    const node = nodeProvider.derive('0')
    const account = accountProvider.provide(node)
    expect(await account.getScript()).toEqual({
      stack: [
        { code: 0, type: 'OP_0' },
        { hex: 'df01eaac7d4f3e28cf3b8929590766d3559e7a69', type: 'OP_PUSHDATA' }
      ]
    })
  })

  it('should get script for 0/0', async () => {
    const node = nodeProvider.derive('0/0')
    const account = accountProvider.provide(node)
    expect(await account.getScript()).toEqual({
      stack: [
        { code: 0, type: 'OP_0' },
        { hex: '938a24a531e4ee0fd4ea12f95058292ed8f3eed4', type: 'OP_PUSHDATA' }
      ]
    })
  })
})

it('address to script', () => {
  const nodeProvider = new TestNodeProvider()
  const accountProvider = new TestAccountProvider([])

  const node = nodeProvider.derive('0')
  const account = accountProvider.provide(node)
  expect(account.addressToScript('bcrt1qur2tmednr6e52u9du972nqvua60egwqkf98ps8')).toEqual({
    stack: [
      { code: 0, type: 'OP_0' },
      { hex: 'e0d4bde5b31eb34570ade17ca9819cee9f943816', type: 'OP_PUSHDATA' }
    ]
  })
})
