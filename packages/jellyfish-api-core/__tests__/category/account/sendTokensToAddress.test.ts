import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { SelectionModeType } from '../../../src/category/account'

describe('SendTokenToAddress', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  let address: string

  async function setup (): Promise<void> {
    address = await container.call('getnewaddress')
    await createToken(address, 'ANT', 100)
    await createToken(address, 'BAT', 100)
  }

  async function createToken (address: string, symbol: string, amount: number): Promise<void> {
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }

    await container.waitForWalletBalanceGTE(amount)
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('utxostoaccount', [{ [address]: `${amount.toString()}@0` }])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  function accToNum (acc: string): number {
    return Number(acc.split('@')[0])
  }

  describe('sendTokensToAddress selectionModes', () => {
    let tokenAddress: string
    let addressForward: string
    let addressPie: string
    let addressCrumbs: string

    beforeAll(async () => {
      tokenAddress = await container.call('getnewaddress')
      addressPie = await container.call('getnewaddress')
      addressForward = await container.call('getnewaddress')
      addressCrumbs = await container.call('getnewaddress')

      await createToken(tokenAddress, 'CAT', 200)

      await container.call('accounttoaccount', [tokenAddress, { [addressForward]: `${49}@CAT` }])
      await container.call('accounttoaccount', [tokenAddress, { [addressCrumbs]: `${3}@CAT` }])
      await container.call('accounttoaccount', [tokenAddress, { [addressPie]: `${104}@CAT` }])
      await container.generate(1)
    })

    it('should sendTokensToAddress with selectionMode pie', async () => {
      const balanceBefore = (await client.account.getAccount(addressPie))[0]
      const addressReceiver = await container.call('getnewaddress')
      const hex = await client.account.sendTokensToAddress({}, { [addressReceiver]: ['4@CAT'] }, {
        selectionMode: SelectionModeType.PIE
      })

      expect(typeof hex).toStrictEqual('string')
      expect(hex.length).toStrictEqual(64)

      await container.generate(1)

      const balanceAfter = (await client.account.getAccount(addressPie))[0]
      expect(accToNum(balanceAfter)).toStrictEqual(accToNum(balanceBefore) - 4)

      const accReceiver = (await client.account.getAccount(addressReceiver))[0]
      expect(accReceiver).toStrictEqual('4.00000000@CAT')
    })

    it('should sendTokensToAddress with selectionMode crumbs', async () => {
      const balanceBefore = (await client.account.getAccount(addressCrumbs))[0]
      const addressReceiver = await container.call('getnewaddress')

      const hex = await client.account.sendTokensToAddress({}, { [addressReceiver]: ['2@CAT'] }, {
        selectionMode: SelectionModeType.CRUMBS
      })
      expect(typeof hex).toStrictEqual('string')
      expect(hex.length).toStrictEqual(64)

      await container.generate(1)

      const balanceAfter = (await client.account.getAccount(addressCrumbs))[0]
      expect(accToNum(balanceAfter)).toStrictEqual(accToNum(balanceBefore) - 2)

      const accountReceiver = (await client.account.getAccount(addressReceiver))[0]
      expect(accountReceiver).toStrictEqual('2.00000000@CAT')
    })

    // NOTE(canonrother): "selectionMode: forward" picks the address name order by ASC, its hard to test as address is random generated
    it.skip('should sendTokensToAddress with selectionMode forward', async () => {
      const balanceForwardBefore = (await client.account.getAccount(addressForward))[0]
      const addressReceiver = await container.call('getnewaddress')

      const hex = await client.account.sendTokensToAddress({}, { [addressReceiver]: ['6@CAT'] }, {
        selectionMode: SelectionModeType.FORWARD
      })
      expect(typeof hex).toStrictEqual('string')
      expect(hex.length).toStrictEqual(64)

      await container.generate(1)

      const balanceAfter = (await client.account.getAccount(addressForward))[0]
      expect(accToNum(balanceAfter)).toStrictEqual(accToNum(balanceForwardBefore) - 6)

      const accountReceiver = (await client.account.getAccount(balanceAfter))[0]
      expect(accountReceiver).toStrictEqual('6.00000000@CAT')
    })
  })

  it('should sendTokensToAddress with multiple receiver tokens', async () => {
    const addressReceiver = await container.call('getnewaddress')
    const hex = await client.account.sendTokensToAddress({}, { [addressReceiver]: ['2@ANT', '10@BAT'] })

    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    expect(await client.account.getAccount(addressReceiver)).toStrictEqual(['2.00000000@ANT', '10.00000000@BAT'])
  })

  it('should sendTokensToAddress with source address', async () => {
    const addressReceiver = await container.call('getnewaddress')
    const hex = await client.account.sendTokensToAddress({ [address]: ['10@ANT'] }, { [addressReceiver]: ['10@ANT'] })

    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    expect(await client.account.getAccount(addressReceiver)).toStrictEqual(['10.00000000@ANT'])
  })

  it('should fail and throw an exception when no receiver address', async () => {
    await expect(client.account.sendTokensToAddress({}, {})).rejects.toThrow('zero amounts in "to" param')
  })

  it('should throw an error when insufficient fund', async () => {
    const promise = client.account.sendTokensToAddress({}, { [await container.call('getnewaddress')]: ['500@CAT'] })

    await expect(promise).rejects.toThrow('Not enough balance on wallet accounts, call utxostoaccount to increase it.')
  })

  it('should throw an error when sending different tokens', async () => {
    const promise = client.account.sendTokensToAddress({ [address]: ['10@ANT'] }, { [await container.call('getnewaddress')]: ['10@BAT'] })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test AnyAccountsToAccountsTx execution failed:\nsum of inputs (from) != sum of outputs (to)\', code: -32600, method: sendtokenstoaddress')
  })

  it('should throw an error when sending different amount', async () => {
    const promise = client.account.sendTokensToAddress({ [address]: ['10@ANT'] }, { [await container.call('getnewaddress')]: ['20@ANT'] })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test AnyAccountsToAccountsTx execution failed:\nsum of inputs (from) != sum of outputs (to)\', code: -32600, method: sendtokenstoaddress')
  })
})
