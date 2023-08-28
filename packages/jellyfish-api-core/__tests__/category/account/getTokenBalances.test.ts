import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TransferDomainType } from '../../../src/category/account'
import waitForExpect from 'wait-for-expect'
import BigNumber from 'bignumber.js'

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)
    await createToken(await container.getNewAddress(), 'DBTC', 200)
    await createToken(await container.getNewAddress(), 'DETH', 200)
  })

  afterAll(async () => {
    await container.stop()
  })

  async function createToken (address: string, symbol: string, amount: number): Promise<void> {
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  it('should getTokenBalances', async () => {
    await waitForExpect(async () => {
      const tokenBalances = await client.account.getTokenBalances()
      expect(tokenBalances.length).toBeGreaterThan(0)
    })

    const tokenBalances = await client.account.getTokenBalances()
    for (let i = 0; i < tokenBalances.length; i += 1) {
      expect(typeof tokenBalances[i]).toStrictEqual('string') // [ '300.00000000@0', '200.00000000@1' ]
    }
  })

  it('should getTokenBalances with pagination start and including_start', async () => {
    let id = ''

    await waitForExpect(async () => {
      const tokenBalances = await client.account.getTokenBalances() // [ '300.00000000@0', '200.00000000@1' ]
      expect(tokenBalances.length).toBeGreaterThan(0)

      id = tokenBalances[tokenBalances.length - 1].split('@')[1]
    })

    const pagination = {
      start: Number(id),
      including_start: true
    }
    const tokenBalances = await client.account.getTokenBalances(pagination)
    expect(tokenBalances.length).toStrictEqual(1)
  })

  it('should getTokenBalances with pagination limit', async () => {
    await waitForExpect(async () => {
      const tokenBalances = await client.account.getTokenBalances()
      expect(tokenBalances.length).toStrictEqual(2)
    })
    const pagination = {
      limit: 1
    }
    const tokenBalances = await client.account.getTokenBalances(pagination)
    expect(tokenBalances.length).toStrictEqual(1)
  })

  it('should getTokenBalances with indexedAmounts true', async () => {
    await waitForExpect(async () => {
      const tokenBalances = await client.account.getTokenBalances({}, true, { symbolLookup: false, includeEth: false })
      expect(typeof tokenBalances === 'object').toStrictEqual(true)
      for (const k in tokenBalances) {
        expect(tokenBalances[k] instanceof BigNumber).toStrictEqual(true)
      }
    })
  })

  it('should getTokenBalances with symbolLookup', async () => {
    await waitForExpect(async () => {
      const tokenBalances = await client.account.getTokenBalances({}, false, { symbolLookup: true, includeEth: false })
      expect(tokenBalances.length).toBeGreaterThan(0)
    })

    const tokenBalances = await client.account.getTokenBalances({}, false, { symbolLookup: true, includeEth: false })
    for (let i = 0; i < tokenBalances.length; i += 1) {
      expect(typeof tokenBalances[i]).toStrictEqual('string')
    }
  })

  it('should getTokenBalances with including eth', async () => {
    await client.masternode.setGov({
      ATTRIBUTES: {
        // Enable evm
        'v0/params/feature/evm': 'true',
        'v0/params/feature/transferdomain': 'true',
        'v0/transferdomain/dvm-evm/enabled': 'true',
        'v0/transferdomain/evm-dvm/enabled': 'true',
        'v0/transferdomain/dvm-evm/dat-enabled': 'true',
        'v0/transferdomain/evm-dvm/dat-enabled': 'true',
        'v0/transferdomain/dvm-evm/src-formats': ['p2pkh', 'bech32'],
        'v0/transferdomain/dvm-evm/dest-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/src-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/auth-formats': ['bech32-erc55'],
        'v0/transferdomain/evm-dvm/dest-formats': ['p2pkh', 'bech32']
      }
    })
    await container.generate(2)

    const dvmAddr = await container.getNewAddress('dvm', 'legacy')
    const evmAddr = await container.getNewAddress('erc55', 'erc55')

    await container.call('utxostoaccount', [{ [dvmAddr]: '100@0' }])
    await container.generate(1)

    await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: '3@DFI',
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: '3@DFI',
          domain: TransferDomainType.EVM
        }
      }
    ])
    await container.generate(1)

    await waitForExpect(async () => {
      const withoutEth = await client.account.getTokenBalances({}, false, { symbolLookup: true, includeEth: false })
      const wo = withoutEth[0].split('@')[0]

      const withEth = await client.account.getTokenBalances({}, false, { symbolLookup: true, includeEth: true })
      const w = withEth[0].split('@')[0]
      expect(new BigNumber(w)).toStrictEqual(new BigNumber(wo).plus(3))
    })
  })
})
