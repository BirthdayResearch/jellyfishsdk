import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  createToken,
  mintTokens,
  utxosToAccount,
  accountToAccount, sendTokensToAddress
} from '../src'

const container = new MasterNodeRegTestContainer()

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(1000000)
})

afterAll(async () => {
  await container.stop()
})

describe('utxosToAccount', () => {
  it('should utxosToAccount', async () => {
    const balanceBefore = await container.call('getbalance')
    expect(balanceBefore).toBeGreaterThanOrEqual(1000000)

    await utxosToAccount(container, 1000000)

    const balanceAfter = await container.call('getbalance')
    expect(balanceAfter).toBeLessThan(balanceBefore - 1000000 + 1000) // extra 1000 due to block gen
  })
})

describe('accountToAccount', () => {
  it('should accountToAccount', async () => {
    const symbol = 'DAD'
    const from = await container.call('getnewaddress')
    await createToken(container, symbol, { collateralAddress: from })
    await mintTokens(container, symbol)

    const to = await container.call('getnewaddress')
    await container.fundAddress(from, 1)
    await accountToAccount(container, symbol, 6, { from, to })

    const accounts = await container.call('listaccounts')
    const account = accounts.find((acc: any) => acc.amount === `6.00000000@${symbol}`)

    expect(account.owner.addresses.length).toBeGreaterThan(0)
    expect(account.owner.addresses[0]).toStrictEqual(to)
  })
})

describe('sendTokensToAddress', () => {
  beforeAll(async () => {
    await container.waitForWalletBalanceGTE(101)
  })

  it('should sendTokensToAddress', async () => {
    const symbol = 'TTA'
    await createToken(container, symbol)
    await mintTokens(container, symbol, {
      mintAmount: 100
    })

    const address = await container.call('getnewaddress')
    await sendTokensToAddress(container, address, 11, 'TTA')

    const account = await container.call('getaccount', [address])
    expect(account).toStrictEqual(['11.00000000@TTA'])
  })
})
