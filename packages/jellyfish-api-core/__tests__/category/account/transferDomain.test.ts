import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TransferDomainType } from '../../../src/category/account'
import { RpcApiError } from '@defichain/jellyfish-api-core/dist/index'
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

    await container.call('createtoken', [{
      symbol: 'BTC',
      name: 'BTC',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: dvmAddr
    }])
    await container.call('createtoken', [{
      symbol: 'ETH',
      name: 'ETH',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: dvmAddr
    }])
    await container.call('createtoken', [{
      name: 'DESC',
      symbol: 'DESC',
      isDAT: false,
      mintable: true,
      tradeable: true,
      collateralAddress: dvmAddr
    }])
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

  describe('transferDomain failed', () => {
    it('should fail if transfer within same domain', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Cannot transfer inside same domain')
    })

    it('should fail if amount is different', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI', // diff
            domain: TransferDomainType.DVM
          },
          dst: {
            address: dvmAddr,
            amount: '46@DFI', // diff
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Source amount must be equal to destination amount')
    })

    it('should fail if transfer diff src and dst token', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: dvmAddr,
            amount: '3@BTC',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Source token and destination token must be the same')
    })

    it('(dvm -> evm) should fail if source address and source domain are not match', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr, // <- not match
            amount: '3@DFI',
            domain: TransferDomainType.DVM // <- not match
          },
          dst: {
            address: evmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Src address must be a legacy or Bech32 address in case of "DVM" domain')
    })

    it('(evm -> dvm) should fail if source address and source domain are not match', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr, // <- not match
            amount: '3@DFI',
            domain: TransferDomainType.EVM // <- not match
          },
          dst: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Src address must be an ERC55 address in case of "EVM" domain')
    })

    it('(dvm -> evm) should fail if destination address and destination domain are not match', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: dvmAddr, // <- not match
            amount: '3@DFI',
            domain: TransferDomainType.EVM // <- not match
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Dst address must be an ERC55 address in case of "EVM" domain')
    })

    it('(evm -> dvm) should fail if destination address and destination domain are not match', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: evmAddr, // <- not match
            amount: '3@DFI',
            domain: TransferDomainType.DVM // <- not match
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Dst address must be a legacy or Bech32 address in case of "DVM" domain')
    })

    it('(dvm -> evm) should fail if address is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: 'invalid',
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
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('recipient (invalid) does not refer to any valid address')
    })

    it('(evm -> dvm) should fail if address is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: 'invalid',
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('recipient (invalid) does not refer to any valid address')
    })

    it('(dvm -> evm) should fail if insufficient balance', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '999999@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '999999@DFI',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('amount 90000.00000000 is less than 999999.00000000')
    })

    it('(evm -> dvm) should fail if insufficient balance', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '999@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: '999@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`Not enough balance in ${evmAddr} to cover "EVM" domain transfer`)
    })

    it('(dvm -> evm) should fail if negative amount', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '-1@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '-1@DFI',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Amount out of range')
    })

    it('(evm -> dvm) should fail if negative amount', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '-1@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: '-1@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Amount out of range')
    })

    it('should not transfer if custom (isDAT = false) token is transferred', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DESC#128',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '3@DESC#128',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Non-DAT or LP tokens are not supported for transferdomain')
    })

    it('should not transfer if loan token is transferred', async () => {
      const dvmAcc = await getAccountValues(client, dvmAddr)
      const tokenId = 'DESC#128'
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

      // check: dvm balance is not transferred
      expect(new BigNumber(dvmBalance0))
        .toStrictEqual(new BigNumber(dvmBalance1))
    })

    it('should fail (duo) Transfer Domain from DVM to EVM', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '1@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '1@DFI',
            domain: TransferDomainType.EVM
          }
        },
        {
          src: {
            address: dvmAddr,
            amount: '1@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '1@DFI',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('TransferDomain currently only supports a single transfer per transaction')
    })

    it('should fail (duo) Transfer Domain from EVM to DVM', async () => {
      const promise = client.account.transferDomain([
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
        },
        {
          src: {
            address: evmAddr,
            amount: '4@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: '4@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('TransferDomain currently only supports a single transfer per transaction')
    })
  })

  it('should Transfer Domain from DVM to EVM', async () => {
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
    expect(new BigNumber(dvmBalance0))
      .toStrictEqual(new BigNumber(dvmBalance1).plus(3))

    // check: evm balance = dvm balance - transferred
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).minus(3))
  })

  it('should Transfer Domain dToken from DVM to EVM', async () => {
    const dvmAcc = await getAccountValues(client, dvmAddr)
    const btcTokenId = 'BTC'
    const ethTokenId = 'ETH'
    const btcBalance = dvmAcc[btcTokenId]
    const ethBalance = dvmAcc[ethTokenId]
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
    const txid2 = await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: '3@ETH',
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: '3@ETH',
          domain: TransferDomainType.EVM
        }
      }
    ])
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
    expect(typeof txid2).toStrictEqual('string')
    expect(txid2.length).toStrictEqual(64)
    await container.generate(1)

    const dvmAcc1 = await getAccountValues(client, dvmAddr)
    const btcBalance1 = dvmAcc1[btcTokenId]
    const ethBalance1 = dvmAcc1[ethTokenId]

    // check: BTC balance is transferred
    expect(new BigNumber(btcBalance1))
      .toStrictEqual(new BigNumber(btcBalance).minus(3))
      // check: ETH balance is transferred
    expect(new BigNumber(ethBalance1))
      .toStrictEqual(new BigNumber(ethBalance).minus(3))
  })

  it('should Transfer Domain from EVM to DVM', async () => {
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
    expect(new BigNumber(dvmBalance0))
      .toStrictEqual(new BigNumber(dvmBalance1).minus(3))

    // check EVM balance
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).plus(3))
  })
})

async function getEVMBalances (client: ContainerAdapterClient): Promise<BigNumber> {
  const withoutEthRes = await client.account.getTokenBalances({}, false)
  const [withoutEth] = withoutEthRes[0].split('@')
  const withEthRes = await client.account.getTokenBalances({}, false, { symbolLookup: false, includeEth: true })
  const [withEth] = withEthRes[0].split('@')
  return new BigNumber(withEth).minus(withoutEth)
}

async function createLoanToken (container: MasterNodeRegTestContainer, address: string): Promise<void> {
  let vaultId
  { // Oracle setup
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'AAPL', currency: 'USD' }
    ]
    const oracleId1 = await container.call('appointoracle', [address, priceFeeds, 1])
    await container.generate(1)
    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    await container.call('setoracledata', [oracleId1, timestamp1, [
      { tokenAmount: '1@DFI', currency: 'USD' }
    ], []])
    await container.call('setoracledata', [oracleId1, timestamp1, [
      { tokenAmount: '1@AAPL', currency: 'USD' }
    ], []])
    await container.generate(1)

    const oracleId2 = await container.call('appointoracle', [address, priceFeeds, 1])
    await container.generate(1)

    const timestamp2 = Math.floor(new Date().getTime() / 1000)
    await container.call('setoracledata', [oracleId2, timestamp2, [
      { tokenAmount: '1@DFI', currency: 'USD' }
    ], []])
    await container.call('setoracledata', [oracleId2, timestamp2, [
      { tokenAmount: '1@AAPL', currency: 'USD' }
    ], []])
    await container.generate(1)

    const oracleId3 = await container.call('appointoracle', [address, priceFeeds, 1])
    await container.generate(1)

    const timestamp3 = Math.floor(new Date().getTime() / 1000)
    await container.call('setoracledata', [oracleId3, timestamp3, [
      { tokenAmount: '1@DFI', currency: 'USD' }
    ], []])
    await container.call('setoracledata', [oracleId3, timestamp3, [
      { tokenAmount: '1@AAPL', currency: 'USD' }
    ], []])
    await container.generate(1)
  }

  { // Loan Scheme
    await container.call('createloanscheme', [100, 1, 'default'])
    await container.generate(1)
  }

  { // Collateral Tokens
    const blockCount = await container.getBlockCount()
    await container.call('setcollateraltoken', [{
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD',
      activateAfterBlock: blockCount + 1
    }])
    await container.generate(30)
  }

  { // Loan Tokens
    await container.call('setloantoken', [{
      symbol: 'AAPL',
      name: 'APPLE',
      fixedIntervalPriceId: 'AAPL/USD',
      mintable: true,
      interest: new BigNumber(0.01)
    }])

    await container.generate(1)
  }

  { // Vault Empty
    vaultId = await container.call('createvault', [address, 'default'])
    await container.generate(1)
  }

  { // Vault Deposit Collateral
    await container.call('deposittovault', [vaultId, address, '10000@DFI'])
    await container.generate(1)
  }

  { // Take Loan
    await container.call('takeloan', [{
      vaultId: vaultId,
      amounts: '30@AAPL'
    }])
    await container.generate(1)
  }
}

async function getAccountValues (client: ContainerAdapterClient, address: string): Promise<{[symbol: string]: string}> {
  const values = await client.account.getAccount(address)
  return values.reduce((res: {[symbol: string]: string}, current: string) => {
    const [value, symbol] = current.split('@')
    return {
      ...res,
      [symbol]: value
    }
  }, {})
}
