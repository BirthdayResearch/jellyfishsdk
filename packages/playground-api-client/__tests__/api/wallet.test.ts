import { StubPlaygroundApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

const service = new StubService()
const testing = Testing.create(service.container)
const client = new StubPlaygroundApiClient(service)

beforeAll(async () => {
  await service.start()
  await service.container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await service.stop()
})

it('should get wallet', async () => {
  const wallet = await client.wallet.balances()

  expect(wallet.tokens.length).toBeGreaterThan(10)
})

describe('tokens', () => {
  it('should send utxo to address and wait for automated block confirmation', async () => {
    const address = await testing.generateAddress()

    const txid = await client.wallet.sendUtxo('19.34153143', address)
    expect(txid.length).toStrictEqual(64)

    const unspent = await testing.rpc.wallet.listUnspent(1, 999999, {
      addresses: [address]
    })

    expect(unspent.length).toStrictEqual(1)
    expect(unspent[0].address).toStrictEqual(address)
    expect(unspent[0].amount).toStrictEqual(new BigNumber('19.34153143'))
  })

  it('should send token 0 to address and wait for automated block confirmation', async () => {
    const address = 'bcrt1qkt7rvkzk8qs7rk54vghrtzcdxfqazscmmp30hk'

    const txid = await client.wallet.sendToken('0', '15.99134567', address)
    expect(txid.length).toStrictEqual(64)

    const balances = await service.container.call('getaccount', [address])
    expect(balances).toStrictEqual(['15.99134567@DFI'])
  })

  it('should keep sending 10@DFI to address x30 times', async () => {
    const addresses = await testing.generateAddress(30)
    await Promise.all(addresses.map(async address => {
      const txid = await client.wallet.sendToken('0', '10', address)
      expect(txid.length).toStrictEqual(64)

      const balances = await testing.rpc.account.getAccount(address)
      expect(balances).toStrictEqual(['10.00000000@DFI'])
    }))
  })

  it('should send token 1 to address and wait for confirmation', async () => {
    const address = 'bcrt1qur2tmednr6e52u9du972nqvua60egwqkf98ps8'
    const txid = await client.wallet.sendToken('1', '1.2343134', address)
    expect(txid.length).toStrictEqual(64)

    const balances = await service.container.call('getaccount', [address])
    expect(balances).toStrictEqual(['1.23431340@BTC'])
  })

  it('should send token 2 to address and wait for confirmation', async () => {
    const address = 'bcrt1qhu2pkzfx4gc8r5nry89ma9xvvt6rz0r4xe5yyw'
    const txid = await client.wallet.sendToken('2', '1.500', address)
    expect(txid.length).toStrictEqual(64)

    const balances = await service.container.call('getaccount', [address])
    expect(balances).toStrictEqual(['1.50000000@ETH'])
  })
})
