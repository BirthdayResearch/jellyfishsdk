import { TestNodeProvider } from './node.mock'
import { TestAccountProvider } from './account.mock'
import { JellyfishWallet } from '../src'

const nodeProvider = new TestNodeProvider()

describe('discover accounts', () => {
  it('should discover [] account when empty', async () => {
    const accountProvider = new TestAccountProvider([])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(0)
  })

  it('should discover [0] when [0] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(1)
  })

  it('should discover [] when [1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qncjrhlntyyrv6dk5xjn0ep6sjfrqv478365v38'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(0)
  })

  it('should discover [0,1] when [0,1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8',
      'bcrt1qncjrhlntyyrv6dk5xjn0ep6sjfrqv478365v38'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(2)
  })

  it('should discover [0,1,2] when [0,1,2] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8',
      'bcrt1qncjrhlntyyrv6dk5xjn0ep6sjfrqv478365v38',
      'bcrt1q2v5wa73qe0ychdheppaeae5s594u3up2d0tha8'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(3)
  })

  it('should discover [0,1] when [0,1,3,4] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8',
      'bcrt1qncjrhlntyyrv6dk5xjn0ep6sjfrqv478365v38',
      'bcrt1q9a2mrm2sp4xpu5k33jakr4jk9zqcwtf3ns3h7j',
      'bcrt1qh7safzu8d2p02vlnhsm2995t3der3qk75wl8y6'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(2)
  })

  it('should discover [0] when [0,1] has activity as max account is set to 1', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8',
      'bcrt1qncjrhlntyyrv6dk5xjn0ep6sjfrqv478365v38'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover(1)
    expect(accounts.length).toStrictEqual(1)
  })
})

describe('is usable', () => {
  it('[0] should be usable regardless', async () => {
    const accountProvider = new TestAccountProvider([])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toStrictEqual(true)
    expect(await wallet.isUsable(1)).toStrictEqual(false)
  })

  it('[0,1] should be usable when [0] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toStrictEqual(true)
    expect(await wallet.isUsable(1)).toStrictEqual(true)
  })

  it('[0,1,2] should be usable when [0,1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8',
      'bcrt1qncjrhlntyyrv6dk5xjn0ep6sjfrqv478365v38'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toStrictEqual(true)
    expect(await wallet.isUsable(1)).toStrictEqual(true)
    expect(await wallet.isUsable(2)).toStrictEqual(true)
  })

  it('[2] should not be usable when [0,1] has no activity', async () => {
    const accountProvider = new TestAccountProvider([])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(2)).toStrictEqual(false)
  })
})

describe('get accounts', () => {
  const accountProvider = new TestAccountProvider([])
  const wallet = new JellyfishWallet(nodeProvider, accountProvider)

  it('should get account 0', async () => {
    const account = wallet.get(0)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qtxqjthltev9zqzfqkgt3t758zmdq2twhf2hkj8')
  })

  it('should get account 1', async () => {
    const account = wallet.get(1)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qncjrhlntyyrv6dk5xjn0ep6sjfrqv478365v38')
  })

  it('should get account 2', async () => {
    const account = wallet.get(2)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1q2v5wa73qe0ychdheppaeae5s594u3up2d0tha8')
  })

  it('should get account 3', async () => {
    const account = wallet.get(3)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1q9a2mrm2sp4xpu5k33jakr4jk9zqcwtf3ns3h7j')
  })

  it('should get account 4', async () => {
    const address = await wallet.get(4).getAddress()
    expect(address).toStrictEqual('bcrt1qh7safzu8d2p02vlnhsm2995t3der3qk75wl8y6')
  })

  it('should get account 5', async () => {
    const address = await wallet.get(5).getAddress()
    expect(address).toStrictEqual('bcrt1qep3yprgx6q0pwuwat3hqj4fnkd3rfkd6cqev6j')
  })

  it('should get account 6', async () => {
    const address = await wallet.get(6).getAddress()
    expect(address).toStrictEqual('bcrt1qqgwks52gufe3e2jplg6k40cat5prgtlr6f2p36')
  })

  it('should get account 7', async () => {
    const address = await wallet.get(7).getAddress()
    expect(address).toStrictEqual('bcrt1q65yacygafrchwxv90wfc2jzdw6c4sl8ejn0mdf')
  })

  it('should get account 8', async () => {
    const address = await wallet.get(8).getAddress()
    expect(address).toStrictEqual('bcrt1qkt7rvkzk8qs7rk54vghrtzcdxfqazscmmp30hk')
  })

  it('should get account 9', async () => {
    const address = await wallet.get(9).getAddress()
    expect(address).toStrictEqual('bcrt1qgpu5k3v66qjf8lc4p4lny0uwdxv6vf94axnjkf')
  })
})
