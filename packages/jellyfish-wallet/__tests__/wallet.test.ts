import { TestNodeProvider } from './node.mock'
import { MockTestAccountData, TestAccountProvider } from './account.mock'
import { JellyfishWallet } from '../src'

const nodeProvider = new TestNodeProvider()
const mockData: MockTestAccountData = {}

describe('discover accounts', () => {
  it('should discover [] account when empty', async () => {
    const accountProvider = new TestAccountProvider({})
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(0)
  })

  it('should discover [0] when [0] has activity', async () => {
    const accountProvider = new TestAccountProvider({
      '028b147a7939b8e510defb56a1fccb80d2557d1fa7b5023a704ad4cfcfc651af2f': mockData
    })
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(1)
  })

  it('should discover [] when [1] has activity', async () => {
    const accountProvider = new TestAccountProvider({
      '0337f21a6b2a6be26086ab0e7509fdb1316ef2a428b2571d1e20cb8886f6e2f9f1': mockData
    })
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(0)
  })

  it('should discover [0,1] when [0,1] has activity', async () => {
    const accountProvider = new TestAccountProvider({
      '028b147a7939b8e510defb56a1fccb80d2557d1fa7b5023a704ad4cfcfc651af2f': mockData,
      '0337f21a6b2a6be26086ab0e7509fdb1316ef2a428b2571d1e20cb8886f6e2f9f1': mockData
    })
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(2)
  })

  it('should discover [0,1,2] when [0,1,2] has activity', async () => {
    const accountProvider = new TestAccountProvider({
      '028b147a7939b8e510defb56a1fccb80d2557d1fa7b5023a704ad4cfcfc651af2f': mockData,
      '0337f21a6b2a6be26086ab0e7509fdb1316ef2a428b2571d1e20cb8886f6e2f9f1': mockData,
      '023bf78af6546c9d957d0fa0d3066f3d7fa735196662e2cce753305926712945d7': mockData
    })
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(3)
  })

  it('should discover [0,1] when [0,1,3,4] has activity', async () => {
    const accountProvider = new TestAccountProvider({
      '028b147a7939b8e510defb56a1fccb80d2557d1fa7b5023a704ad4cfcfc651af2f': mockData,
      '0337f21a6b2a6be26086ab0e7509fdb1316ef2a428b2571d1e20cb8886f6e2f9f1': mockData,
      '02a9b7278229a9a4cb20a7852bf540559dc844faba558338d221cd0d26b795fdbb': mockData,
      '02acf1d65943ce391c5c7a6319050c71ece26f5815f1a69445edd35b8d8dac13be': mockData
    })
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toBe(2)
  })

  it('should discover [0] when [0,1] has activity as max account is set to 1', async () => {
    const accountProvider = new TestAccountProvider({
      '028b147a7939b8e510defb56a1fccb80d2557d1fa7b5023a704ad4cfcfc651af2f': mockData,
      '0337f21a6b2a6be26086ab0e7509fdb1316ef2a428b2571d1e20cb8886f6e2f9f1': mockData
    })
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover(1)
    expect(accounts.length).toBe(1)
  })
})

describe('is usable', () => {
  it('[0] should be usable regardless', async () => {
    const accountProvider = new TestAccountProvider({})
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toBe(true)
    expect(await wallet.isUsable(1)).toBe(false)
  })

  it('[0,1] should be usable when [0] has activity', async () => {
    const accountProvider = new TestAccountProvider({
      '028b147a7939b8e510defb56a1fccb80d2557d1fa7b5023a704ad4cfcfc651af2f': mockData
    })
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toBe(true)
    expect(await wallet.isUsable(1)).toBe(true)
  })

  it('[0,1,2] should be usable when [0,1] has activity', async () => {
    const accountProvider = new TestAccountProvider({
      '028b147a7939b8e510defb56a1fccb80d2557d1fa7b5023a704ad4cfcfc651af2f': mockData,
      '0337f21a6b2a6be26086ab0e7509fdb1316ef2a428b2571d1e20cb8886f6e2f9f1': mockData
    })
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toBe(true)
    expect(await wallet.isUsable(1)).toBe(true)
    expect(await wallet.isUsable(2)).toBe(true)
  })

  it('[2] should be usable when [0,1] has no activity', async () => {
    const accountProvider = new TestAccountProvider({})
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(2)).toBe(false)
  })
})

describe('get accounts', () => {
  const accountProvider = new TestAccountProvider({})
  const wallet = new JellyfishWallet(nodeProvider, accountProvider)

  it('should get account 0', async () => {
    const account = wallet.get(0)
    const address = await account.getAddress()
    expect(address).toBe('028b147a7939b8e510defb56a1fccb80d2557d1fa7b5023a704ad4cfcfc651af2f')
  })

  it('should get account 1', async () => {
    const account = wallet.get(1)
    const address = await account.getAddress()
    expect(address).toBe('0337f21a6b2a6be26086ab0e7509fdb1316ef2a428b2571d1e20cb8886f6e2f9f1')
  })
})
