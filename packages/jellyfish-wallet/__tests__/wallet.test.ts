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
      'bcrt1qyf5c9593u8v5s7exh3mfndw28k6sz84788tlze'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(0)
  })

  it('should discover [0,1] when [0,1] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2',
      'bcrt1qyf5c9593u8v5s7exh3mfndw28k6sz84788tlze'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(2)
  })

  it('should discover [0,1,2] when [0,1,2] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2',
      'bcrt1qyf5c9593u8v5s7exh3mfndw28k6sz84788tlze',
      'bcrt1qm4kmrktw4xtcd9xy5v643u8qc8pf7elfy54mm7'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(3)
  })

  it('should discover [0,1] when [0,1,3,4] has activity', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2',
      'bcrt1qyf5c9593u8v5s7exh3mfndw28k6sz84788tlze',
      'bcrt1quak0rspszf8l0r4kw8a0ypexdl9frsp56h62vg',
      'bcrt1qufm8zulstmwej6jq2qr98m80uvj2v9l40rhll4'
    ])
    const wallet = new JellyfishWallet(nodeProvider, accountProvider)

    const accounts = await wallet.discover()
    expect(accounts.length).toStrictEqual(2)
  })

  it('should discover [0] when [0,1] has activity as max account is set to 1', async () => {
    const accountProvider = new TestAccountProvider([
      'bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2',
      'bcrt1qyf5c9593u8v5s7exh3mfndw28k6sz84788tlze'
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
      'bcrt1qyf5c9593u8v5s7exh3mfndw28k6sz84788tlze'
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

describe('get accounts LIGHT_WALLET default', () => {
  const accountProvider = new TestAccountProvider([])
  const wallet = new JellyfishWallet(nodeProvider, accountProvider)

  it('should get account 0 (default address)', async () => {
    const account = wallet.get(0)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qwm0jzcy0jfyel8he42u9536u9wzefmwr5mdkc2')
  })

  it('should get account 1', async () => {
    const account = wallet.get(1)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qyf5c9593u8v5s7exh3mfndw28k6sz84788tlze')
  })

  it('should get account 2', async () => {
    const account = wallet.get(2)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qm4kmrktw4xtcd9xy5v643u8qc8pf7elfy54mm7')
  })

  it('should get account 3', async () => {
    const account = wallet.get(3)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1quak0rspszf8l0r4kw8a0ypexdl9frsp56h62vg')
  })

  it('should get account 4', async () => {
    const address = await wallet.get(4).getAddress()
    expect(address).toStrictEqual('bcrt1qufm8zulstmwej6jq2qr98m80uvj2v9l40rhll4')
  })

  it('should get account 5', async () => {
    const address = await wallet.get(5).getAddress()
    expect(address).toStrictEqual('bcrt1qnzl6heuvzzalutvftq7prwqtlgcsujmr8wukmw')
  })

  it('should get account 6', async () => {
    const address = await wallet.get(6).getAddress()
    expect(address).toStrictEqual('bcrt1q5urh79qjuj3j55d29cl8nhjh5mvauu6s7xfcdd')
  })

  it('should get account 7', async () => {
    const address = await wallet.get(7).getAddress()
    expect(address).toStrictEqual('bcrt1qk8w8gv8g5508wcjcerpx6a2esatqf44h9cj8l5')
  })

  it('should get account 8', async () => {
    const address = await wallet.get(8).getAddress()
    expect(address).toStrictEqual('bcrt1qyrx9j2nhuulgv3nclpv43r9vmp2ky6w7hv3t8h')
  })

  it('should get account 9', async () => {
    const address = await wallet.get(9).getAddress()
    expect(address).toStrictEqual('bcrt1qg34rgkscf3l4h9j02g4vr9t5vmmw6crtmucz0k')
  })
})

describe('get accounts on MASTERNODE', () => {
  const accountProvider = new TestAccountProvider([])
  const wallet = new JellyfishWallet(
    nodeProvider, accountProvider, JellyfishWallet.COIN_TYPE_DFI, JellyfishWallet.PURPOSE_LIGHT_MASTERNODE
  )

  it('should get account 0', async () => {
    const account = wallet.get(0)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qn823x6sqpc66fuy2g0ylufe4sfaculfs87sulp')
  })

  it('should get account 1', async () => {
    const account = wallet.get(1)
    const address = await account.getAddress()
    expect(address).toStrictEqual('bcrt1qfyygclxhcwh97hyylhkn3asucae29x6qhnnh47')
  })
})
