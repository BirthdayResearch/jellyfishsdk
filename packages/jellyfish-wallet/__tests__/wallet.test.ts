import { TestNodeProvider } from './node.mock'
import { TestAccountProvider } from './account.mock'
import { JellyfishWallet } from '../src'

const nodeProvider = new TestNodeProvider()

describe('discover accounts', () => {
  it('should discover [] account when empty', async () => {
    const accountProvider = new TestAccountProvider([])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(0)
  })

  it('should discover [0] when [0] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(1)
  })

  it('should discover [] when [1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qnkmmcu79glheaqsq3gj4gg4675z3cjzn39dt24'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(0)
  })

  it('should discover [0,1] when [0,1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r',
      'bcrt1qnkmmcu79glheaqsq3gj4gg4675z3cjzn39dt24'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(2)
  })

  it('should discover [0,1,2] when [0,1,2] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r',
      'bcrt1qnkmmcu79glheaqsq3gj4gg4675z3cjzn39dt24',
      'bcrt1qrvt6c60848p8y8vd3pejdt33davp5ka9vxupuj'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(3)
  })

  it('should discover [0,1] when [0,1,3,4] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r',
      'bcrt1qnkmmcu79glheaqsq3gj4gg4675z3cjzn39dt24',
      'bcrt1qur2tmednr6e52u9du972nqvua60egwqkf98ps8',
      'bcrt1qxvvp3tz5u8t90nwwjzsalha66zk9em95tgn3fk'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(2)
  })

  it('should discover [0] when [0,1] has activity as max account is set to 1', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r',
      'bcrt1qnkmmcu79glheaqsq3gj4gg4675z3cjzn39dt24'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover(1)
    expect(accounts.length).toBe(1)
  })
})

describe('is usable', () => {
  it('[0] should be usable regardless', async () => {
    const accountProvider = new TestAccountProvider([])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toBe(true)
    expect(await wallet.isUsable(1)).toBe(false)
  })

  it('[0,1] should be usable when [0] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toBe(true)
    expect(await wallet.isUsable(1)).toBe(true)
  })

  it('[0,1,2] should be usable when [0,1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r',
      'bcrt1qnkmmcu79glheaqsq3gj4gg4675z3cjzn39dt24'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toBe(true)
    expect(await wallet.isUsable(1)).toBe(true)
    expect(await wallet.isUsable(2)).toBe(true)
  })

  it('[2] should be usable when [0,1] has no activity', async () => {
    const accountProvider = new TestAccountProvider([])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(2)).toBe(false)
  })
})

describe('get accounts', () => {
  const accountProvider = new TestAccountProvider([])
  const wallet = new JellyfishWallet(nodeProvider, accountProvider)

  it('should get account 0', async () => {
    const account = wallet.get(0)
    const address = await account.getAddress()
    expect(address).toBe('bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r')
  })

  it('should get account 1', async () => {
    const account = wallet.get(1)
    const address = await account.getAddress()
    expect(address).toBe('bcrt1qnkmmcu79glheaqsq3gj4gg4675z3cjzn39dt24')
  })

  it('should get account 2', async () => {
    const account = wallet.get(2)
    const address = await account.getAddress()
    expect(address).toBe('bcrt1qrvt6c60848p8y8vd3pejdt33davp5ka9vxupuj')
  })

  it('should get account 3', async () => {
    const account = wallet.get(3)
    const address = await account.getAddress()
    expect(address).toBe('bcrt1qur2tmednr6e52u9du972nqvua60egwqkf98ps8')
  })

  it('should get account 4', async () => {
    const account = wallet.get(4)
    const address = await account.getAddress()
    expect(address).toBe('bcrt1qxvvp3tz5u8t90nwwjzsalha66zk9em95tgn3fk')
  })
})
