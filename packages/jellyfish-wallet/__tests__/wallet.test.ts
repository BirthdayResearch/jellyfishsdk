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
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(1)
  })

  it('should discover [] when [1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qn823x6sqpc66fuy2g0ylufe4sfaculfs87sulp'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(0)
  })

  it('should discover [0,1] when [0,1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2',
      'bcrt1qn823x6sqpc66fuy2g0ylufe4sfaculfs87sulp'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(2)
  })

  it('should discover [0,1,2] when [0,1,2] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2',
      'bcrt1qn823x6sqpc66fuy2g0ylufe4sfaculfs87sulp',
      'bcrt1qhu2pkzfx4gc8r5nry89ma9xvvt6rz0r4xe5yyw'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(3)
  })

  it('should discover [0,1] when [0,1,3,4] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2',
      'bcrt1qn823x6sqpc66fuy2g0ylufe4sfaculfs87sulp',
      'bcrt1q5kn8n6wne38q84z86ukghluh4d0seqp2rcfw5g',
      'bcrt1qwtjj8kjc92zcya6jjprjvdn3h2vw9uh003q4c3'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(2)
  })

  it('should discover [0] when [0,1] has activity as max account is set to 1', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2',
      'bcrt1qn823x6sqpc66fuy2g0ylufe4sfaculfs87sulp'
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
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)
    expect(await wallet.isUsable(0)).toStrictEqual(true)
    expect(await wallet.isUsable(1)).toStrictEqual(true)
  })

  it('[0,1,2] should be usable when [0,1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2',
      'bcrt1qn823x6sqpc66fuy2g0ylufe4sfaculfs87sulp'
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
    expect(address).toStrictEqual('bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2')
  })

  it('should get account 1', async () => {
    const account = wallet.get(1)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qn823x6sqpc66fuy2g0ylufe4sfaculfs87sulp')
  })

  it('should get account 2', async () => {
    const account = wallet.get(2)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qhu2pkzfx4gc8r5nry89ma9xvvt6rz0r4xe5yyw')
  })

  it('should get account 3', async () => {
    const account = wallet.get(3)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1q5kn8n6wne38q84z86ukghluh4d0seqp2rcfw5g')
  })

  it('should get account 4', async () => {
    const address = await wallet.get(4).getAddress()
    expect(address).toStrictEqual('bcrt1qwtjj8kjc92zcya6jjprjvdn3h2vw9uh003q4c3')
  })

  it('should get account 5', async () => {
    const address = await wallet.get(5).getAddress()
    expect(address).toStrictEqual('bcrt1qcs3ny98wsfpch99mhp24gthzy0scz0l2ej43y0')
  })

  it('should get account 6', async () => {
    const address = await wallet.get(6).getAddress()
    expect(address).toStrictEqual('bcrt1qrl6m7payyuuwgqv6zmx5yk09l4najqphgljcpp')
  })

  it('should get account 7', async () => {
    const address = await wallet.get(7).getAddress()
    expect(address).toStrictEqual('bcrt1qm8y3cvv6g3az6k5lj3435d79wnepspx6j8hqqj')
  })

  it('should get account 8', async () => {
    const address = await wallet.get(8).getAddress()
    expect(address).toStrictEqual('bcrt1qfm27gdjmr739est3jgv84cnxnavdp6y0zgm3wv')
  })

  it('should get account 9', async () => {
    const address = await wallet.get(9).getAddress()
    expect(address).toStrictEqual('bcrt1q4pj4gfe73x4ww58a42ysdktpj98fn64pjeh47d')
  })
})
