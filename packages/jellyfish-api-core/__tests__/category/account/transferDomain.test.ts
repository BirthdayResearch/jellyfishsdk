import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TransferDomainType } from '../../../src/category/account'
import BigNumber from 'bignumber.js'

describe('TransferDomain', () => {
  let dvmAddr: string, evmAddr: string
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    await client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/evm': 'true',
        'v0/params/feature/transferdomain': 'true',
        'v0/transferdomain/dvm-evm/enabled': 'true',
        'v0/transferdomain/evm-dvm/enabled': 'true',
        'v0/transferdomain/dvm-evm/dat-enabled': 'true',
        'v0/transferdomain/evm-dvm/dat-enabled': 'true'
      }
    })
    await container.generate(1)

    dvmAddr = await container.getNewAddress('address1', 'legacy')
    evmAddr = await container.getNewAddress('eth', 'eth')

    await container.call('utxostoaccount', [{ [dvmAddr]: '100000@0' }])
    await container.generate(1)

    await container.call('createtoken', [
      {
        symbol: 'BTC',
        name: 'BTC',
        isDAT: true,
        mintable: true,
        tradeable: true,
        collateralAddress: dvmAddr
      }
    ])
    await container.call('createtoken', [
      {
        symbol: 'ETH',
        name: 'ETH',
        isDAT: true,
        mintable: true,
        tradeable: true,
        collateralAddress: dvmAddr
      }
    ])
    await container.call('createtoken', [
      {
        name: 'DESC',
        symbol: 'DESC',
        isDAT: false,
        mintable: true,
        tradeable: true,
        collateralAddress: dvmAddr
      }
    ])
    await container.generate(1)
    await container.call('minttokens', ['10@BTC'])
    await container.call('minttokens', ['10@ETH'])
    await container.call('minttokens', ['10@DESC#128'])
    await container.generate(1)
    await createLoanToken(container, dvmAddr)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('(dvm -> evm) should transfer domain - DFI', async () => {
    const dvmAcc = await getAccountValues(client, dvmAddr)
    const tokenId = 'DFI'
    const dvmBalance0 = dvmAcc[tokenId]
    const prevBalance = await getEVMBalances(client)

    const txid = await client.account.transferDomain([
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
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    const dvmAcc1 = await getAccountValues(client, dvmAddr)
    const dvmBalance1 = dvmAcc1[tokenId]

    // check: dvm balance is transferred
    expect(new BigNumber(dvmBalance0)).toStrictEqual(
      new BigNumber(dvmBalance1).plus(3)
    )

    // check: evm balance = dvm balance - transferred
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance)).toStrictEqual(
      new BigNumber(currentBalance).minus(3)
    )
  })

  it('(dvm -> evm) should transfer domain - dToken', async () => {
    const dvmAcc = await getAccountValues(client, dvmAddr)
    const btcTokenId = 'BTC'
    const btcBalance = dvmAcc[btcTokenId]
    const txid1 = await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: '3@BTC',
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: '3@BTC',
          domain: TransferDomainType.EVM
        }
      }
    ])
    expect(typeof txid1).toStrictEqual('string')
    expect(txid1.length).toStrictEqual(64)

    await container.generate(1)

    const dvmAcc1 = await getAccountValues(client, dvmAddr)
    const btcBalance1 = dvmAcc1[btcTokenId]

    // check: BTC balance is transferred
    expect(new BigNumber(btcBalance1)).toStrictEqual(
      new BigNumber(btcBalance).minus(3)
    )
  })

  it('(evm -> dvm) should transfer domain - DFI', async () => {
    const dvmAcc = await getAccountValues(client, dvmAddr)
    const tokenId = 'DFI'
    const dvmBalance0 = dvmAcc[tokenId]
    const prevBalance = await getEVMBalances(client)
    const txid = await client.account.transferDomain([
      {
        src: {
          address: evmAddr,
          amount: '3@DFI',
          domain: TransferDomainType.EVM
        },
        dst: {
          address: dvmAddr,
          amount: '3@DFI',
          domain: TransferDomainType.DVM
        }
      }
    ])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)

    await container.generate(1)

    const dvmAcc1 = await getAccountValues(client, dvmAddr)
    const dvmBalance1 = dvmAcc1[tokenId]
    expect(new BigNumber(dvmBalance0)).toStrictEqual(
      new BigNumber(dvmBalance1).minus(3)
    )

    // check EVM balance
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance)).toStrictEqual(
      new BigNumber(currentBalance).plus(3)
    )
  })

  it('(evm -> dvm) should transfer domain - dToken', async () => {
    const dvmAcc = await getAccountValues(client, dvmAddr)
    const btcTokenId = 'BTC'
    const btcBalance = dvmAcc[btcTokenId]
    const txid1 = await client.account.transferDomain([
      {
        src: {
          address: evmAddr,
          amount: '3@BTC',
          domain: TransferDomainType.EVM
        },
        dst: {
          address: dvmAddr,
          amount: '3@BTC',
          domain: TransferDomainType.DVM
        }
      }
    ])
    expect(typeof txid1).toStrictEqual('string')
    expect(txid1.length).toStrictEqual(64)

    await container.generate(1)

    const dvmAcc1 = await getAccountValues(client, dvmAddr)
    const btcBalance1 = dvmAcc1[btcTokenId]

    // check: BTC balance is transferred
    expect(new BigNumber(btcBalance1)).toStrictEqual(
      new BigNumber(btcBalance).plus(3)
    )
  })

  it('(dvm -> evm) should transfer domain - loan token', async () => {
    const dvmAcc = await getAccountValues(client, dvmAddr)
    const tokenId = 'AAPL'
    const dvmBalance0 = dvmAcc[tokenId]

    const txid = await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: '3@AAPL',
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: '3@AAPL',
          domain: TransferDomainType.EVM
        }
      }
    ])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    const dvmAcc1 = await getAccountValues(client, dvmAddr)
    const dvmBalance1 = dvmAcc1[tokenId]

    // check dvm balance is transferred
    expect(new BigNumber(dvmBalance1)).toStrictEqual(
      new BigNumber(dvmBalance0).minus(3)
    )
  })

  it('(evm -> dvm) should transfer domain - loan token', async () => {
    const dvmAcc = await getAccountValues(client, dvmAddr)
    const tokenId = 'AAPL'
    const dvmBalance0 = dvmAcc[tokenId]

    const txid = await client.account.transferDomain([
      {
        src: {
          address: evmAddr,
          amount: '3@AAPL',
          domain: TransferDomainType.EVM
        },
        dst: {
          address: dvmAddr,
          amount: '3@AAPL',
          domain: TransferDomainType.DVM
        }
      }
    ])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    const dvmAcc1 = await getAccountValues(client, dvmAddr)
    const dvmBalance1 = dvmAcc1[tokenId]

    // check dvm balance is received
    expect(new BigNumber(dvmBalance1)).toStrictEqual(
      new BigNumber(dvmBalance0).plus(3)
    )
  })
})

async function getEVMBalances (
  client: ContainerAdapterClient
): Promise<BigNumber> {
  const withoutEthRes = await client.account.getTokenBalances({}, false)
  const [withoutEth] = withoutEthRes[0].split('@')
  const withEthRes = await client.account.getTokenBalances({}, false, {
    symbolLookup: false,
    includeEth: true
  })
  const [withEth] = withEthRes[0].split('@')
  return new BigNumber(withEth).minus(withoutEth)
}

async function createLoanToken (
  container: MasterNodeRegTestContainer,
  address: string
): Promise<void> {
  let vaultId
  {
    // Oracle setup
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'AAPL', currency: 'USD' }
    ]
    const oracleId1 = await container.call('appointoracle', [
      address,
      priceFeeds,
      1
    ])
    await container.generate(1)
    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    await container.call('setoracledata', [
      oracleId1,
      timestamp1,
      [{ tokenAmount: '1@DFI', currency: 'USD' }],
      []
    ])
    await container.call('setoracledata', [
      oracleId1,
      timestamp1,
      [{ tokenAmount: '1@AAPL', currency: 'USD' }],
      []
    ])
    await container.generate(1)

    const oracleId2 = await container.call('appointoracle', [
      address,
      priceFeeds,
      1
    ])
    await container.generate(1)

    const timestamp2 = Math.floor(new Date().getTime() / 1000)
    await container.call('setoracledata', [
      oracleId2,
      timestamp2,
      [{ tokenAmount: '1@DFI', currency: 'USD' }],
      []
    ])
    await container.call('setoracledata', [
      oracleId2,
      timestamp2,
      [{ tokenAmount: '1@AAPL', currency: 'USD' }],
      []
    ])
    await container.generate(1)

    const oracleId3 = await container.call('appointoracle', [
      address,
      priceFeeds,
      1
    ])
    await container.generate(1)

    const timestamp3 = Math.floor(new Date().getTime() / 1000)
    await container.call('setoracledata', [
      oracleId3,
      timestamp3,
      [{ tokenAmount: '1@DFI', currency: 'USD' }],
      []
    ])
    await container.call('setoracledata', [
      oracleId3,
      timestamp3,
      [{ tokenAmount: '1@AAPL', currency: 'USD' }],
      []
    ])
    await container.generate(1)
  }

  {
    // Loan Scheme
    await container.call('createloanscheme', [100, 1, 'default'])
    await container.generate(1)
  }

  {
    // Collateral Tokens
    const blockCount = await container.getBlockCount()
    await container.call('setcollateraltoken', [
      {
        token: 'DFI',
        factor: new BigNumber(1),
        fixedIntervalPriceId: 'DFI/USD',
        activateAfterBlock: blockCount + 1
      }
    ])
    await container.generate(30)
  }

  {
    // Loan Tokens
    await container.call('setloantoken', [
      {
        symbol: 'AAPL',
        name: 'APPLE',
        fixedIntervalPriceId: 'AAPL/USD',
        mintable: true,
        interest: new BigNumber(0.01)
      }
    ])

    await container.generate(1)
  }

  {
    // Vault Empty
    vaultId = await container.call('createvault', [address, 'default'])
    await container.generate(1)
  }

  {
    // Vault Deposit Collateral
    await container.call('deposittovault', [vaultId, address, '10000@DFI'])
    await container.generate(1)
  }

  {
    // Take Loan
    await container.call('takeloan', [
      {
        vaultId: vaultId,
        amounts: '30@AAPL'
      }
    ])
    await container.generate(1)
  }
}

async function getAccountValues (
  client: ContainerAdapterClient,
  address: string
): Promise<{ [symbol: string]: string }> {
  const values = await client.account.getAccount(address)
  return values.reduce((res: { [symbol: string]: string }, current: string) => {
    const [value, symbol] = current.split('@')
    return {
      ...res,
      [symbol]: value
    }
  }, {})
}
