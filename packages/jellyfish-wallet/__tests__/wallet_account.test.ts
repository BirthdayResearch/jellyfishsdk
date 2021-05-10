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
