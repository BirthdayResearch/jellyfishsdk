import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'
import BigNumber from 'bignumber.js'

const apiTesting = PlaygroundApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
  await apiTesting.container.waitForWalletCoinbaseMaturity()
})

afterAll(async () => {
  await apiTesting.stop()
})

describe('balances', () => {
  it('should be able to get wallet balances', async () => {
    const res = await apiTesting.client.wallet.balances()
    expect(res.balance).toBeGreaterThanOrEqual(10000)
  })
})

describe('sendUtxo', () => {
  it('should send utxo to address and wait for automated block confirmation', async () => {
    const address = await apiTesting.testing.generateAddress()

    const txid = await apiTesting.client.wallet.sendUtxo('19.34153143', address)
    expect(txid.length).toStrictEqual(64)

    const unspent = await apiTesting.rpc.wallet.listUnspent(1, 999999, {
      addresses: [address]
    })

    expect(unspent.length).toStrictEqual(1)
    expect(unspent[0].address).toStrictEqual(address)
    expect(unspent[0].amount).toStrictEqual(new BigNumber('19.34153143'))
  })

  it('should send token 0 to address and wait for automated block confirmation', async () => {
    const address = 'bcrt1qkt7rvkzk8qs7rk54vghrtzcdxfqazscmmp30hk'

    const txid = await apiTesting.client.wallet.sendToken('0', '15.99134567', address)
    expect(txid.length).toStrictEqual(64)

    const balances = await apiTesting.container.call('getaccount', [address])
    expect(balances).toStrictEqual(['15.99134567@DFI'])
  })
})

// TODO(canonbrother): will remove the comment after the setupTokens is up
// describe('sendToken', () => {
//   it('should keep sending 10@DFI to address x30 times', async () => {
//     const addresses = await apiTesting.testing.generateAddress(30)
//     await Promise.all(addresses.map(async address => {
//       const txid = await apiTesting.client.wallet.sendToken('0', '10', address)
//       expect(txid.length).toStrictEqual(64)

//       const balances = await apiTesting.rpc.account.getAccount(address)
//       expect(balances).toStrictEqual(['10.00000000@DFI'])
//     }))
//   })

//   it('should send token 1 to address and wait for confirmation', async () => {
//     const address = 'bcrt1qur2tmednr6e52u9du972nqvua60egwqkf98ps8'
//     const txid = await apiTesting.client.wallet.sendToken('1', '1.2343134', address)
//     expect(txid.length).toStrictEqual(64)

//     const balances = await apiTesting.container.call('getaccount', [address])
//     expect(balances).toStrictEqual(['1.23431340@BTC'])
//   })

//   it('should send token 2 to address and wait for confirmation', async () => {
//     const address = 'bcrt1qhu2pkzfx4gc8r5nry89ma9xvvt6rz0r4xe5yyw'
//     const txid = await apiTesting.client.wallet.sendToken('2', '1.500', address)
//     expect(txid.length).toStrictEqual(64)

//     const balances = await apiTesting.container.call('getaccount', [address])
//     expect(balances).toStrictEqual(['1.50000000@ETH'])
//   })
// })
