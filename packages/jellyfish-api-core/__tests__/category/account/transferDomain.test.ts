import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TransferDomainType } from '../../../src/category/account'
import { RpcApiError } from '@defichain/jellyfish-api-core/dist/index'
import BigNumber from 'bignumber.js'

enum Transfer {
  THREE = 3,
  FOUR = 4,
}

describe('TransferDomain', () => {
  let dvmAddr: string, evmAddr: string
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    await client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/evm': 'true'
      }
    })
    await container.generate(1)

    dvmAddr = await container.call('getnewaddress')
    evmAddr = await container.getNewAddress('eth', 'eth')

    await container.call('utxostoaccount', [{ [dvmAddr]: '100@0' }])
    await container.generate(1)

    await container.call('createtoken', [{
      symbol: 'BTC',
      name: 'BTC',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: dvmAddr
    }])
    await container.generate(1)

    await container.call('minttokens', ['10@BTC'])
    await container.generate(1)
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
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.DVM
          },
          dst: {
            address: dvmAddr,
            amount: `${Transfer.THREE + 46}@DFI`,
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
            amount: `${Transfer.THREE}@DFI`, // diff
            domain: TransferDomainType.DVM
          },
          dst: {
            address: dvmAddr,
            amount: `${Transfer.THREE + 46}@DFI`, // diff
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Source amount must be equal to destination amount')
    })

    it('should fail if transfer other than DFI token', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.DVM
          },
          dst: {
            address: dvmAddr,
            amount: `${Transfer.THREE}@BTC`,
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('For transferdomain, only DFI token is currently supported')
    })

    it('(dvm -> evm) should fail if source address and source domain are not match', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr, // <- not match
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.DVM // <- not match
          },
          dst: {
            address: evmAddr,
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Src address must not be an ETH address in case of "DVM" domain')
    })

    it('(evm -> dvm) should fail if source address and source domain are not match', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr, // <- not match
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.EVM // <- not match
          },
          dst: {
            address: dvmAddr,
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Src address must be an ETH address in case of "EVM" domain')
    })

    it('(dvm -> evm) should fail if destination address and destination domain are not match', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.DVM
          },
          dst: {
            address: dvmAddr, // <- not match
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.EVM // <- not match
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Dst address must be an ETH address in case of "EVM" domain')
    })

    it('(evm -> dvm) should fail if destination address and destination domain are not match', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.EVM
          },
          dst: {
            address: evmAddr, // <- not match
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.DVM // <- not match
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Dst address must not be an ETH address in case of "DVM" domain')
    })

    it('(dvm -> evm) should fail if address is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: 'invalid',
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: `${Transfer.THREE}@DFI`,
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
            amount: `${Transfer.THREE}@DFI`,
            domain: TransferDomainType.EVM
          },
          dst: {
            address: 'invalid',
            amount: `${Transfer.THREE}@DFI`,
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
            amount: '999@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '999@DFI',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('amount 100.00000000 is less than 999.00000000')
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
  })

  it('should Transfer Domain from DVM to EVM', async () => {
    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')

    const txid = await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.EVM
        }
      }
    ])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)

    // check: dvm balance is transfered
    expect(new BigNumber(dvmBalance1).toNumber())
      .toStrictEqual(new BigNumber(dvmBalance0).minus(Transfer.THREE).toNumber())

    // check: evm balance = dvm balance - tranferred
    const withoutEthRes = await client.account.getTokenBalances({}, false)
    const [withoutEth] = withoutEthRes[0].split('@')

    const withEthRes = await client.account.getTokenBalances({}, false, { symbolLookup: false, includeEth: true })
    const [withEth] = withEthRes[0].split('@')
    expect(new BigNumber(withoutEth).toNumber())
      .toStrictEqual(new BigNumber(withEth).minus(Transfer.THREE).toNumber())
  })

  it('should Transfer Domain from EVM to DVM', async () => {
    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')

    const txid = await client.account.transferDomain([
      {
        src: {
          address: evmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.EVM
        },
        dst: {
          address: dvmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.DVM
        }
      }
    ])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)

    await container.generate(1)

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)
    expect(new BigNumber(dvmBalance1).toNumber())
      .toStrictEqual(new BigNumber(dvmBalance0).plus(Transfer.THREE).toNumber())

    // check eth balance to be equal to zero
    const withoutEthRes = await client.account.getTokenBalances({}, false)
    const [withoutEth] = withoutEthRes[0].split('@')
    const withEthRes = await client.account.getTokenBalances({}, false, { symbolLookup: false, includeEth: true })
    const [withEth] = withEthRes[0].split('@')
    expect(new BigNumber(withoutEth).toNumber()).toStrictEqual(new BigNumber(withEth).toNumber())
  })

  it('should (duo) Transfer Domain from DVM to EVM', async () => {
    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')

    const txid = await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.EVM
        }
      },
      {
        src: {
          address: dvmAddr,
          amount: `${Transfer.FOUR}@DFI`,
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: `${Transfer.FOUR}@DFI`,
          domain: TransferDomainType.EVM
        }
      }
    ])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
    await container.generate(1)

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)

    // check: dvm balance is transfered
    expect(new BigNumber(dvmBalance1).toNumber())
      .toStrictEqual(new BigNumber(dvmBalance0).minus(Transfer.THREE + Transfer.FOUR).toNumber())

    // check: evm balance = dvm balance - tranferred
    const withoutEthRes = await client.account.getTokenBalances({}, false)
    const [withoutEth] = withoutEthRes[0].split('@')

    const withEthRes = await client.account.getTokenBalances({}, false, { symbolLookup: false, includeEth: true })
    const [withEth] = withEthRes[0].split('@')
    expect(new BigNumber(withoutEth).toNumber())
      .toStrictEqual(new BigNumber(withEth).minus(Transfer.THREE + Transfer.FOUR).toNumber())
  })

  it('should (duo) Transfer Domain from EVM to DVM', async () => {
    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')

    const txid = await client.account.transferDomain([
      {
        src: {
          address: evmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.EVM
        },
        dst: {
          address: dvmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.DVM
        }
      },
      {
        src: {
          address: evmAddr,
          amount: `${Transfer.FOUR}@DFI`,
          domain: TransferDomainType.EVM
        },
        dst: {
          address: dvmAddr,
          amount: `${Transfer.FOUR}@DFI`,
          domain: TransferDomainType.DVM
        }
      }
    ])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)

    await container.generate(1)

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)
    expect(new BigNumber(dvmBalance1).toNumber())
      .toStrictEqual(new BigNumber(dvmBalance0).plus(Transfer.THREE + Transfer.FOUR).toNumber())

    // check eth balance to be equal to zero
    const withoutEthRes = await client.account.getTokenBalances({}, false)
    const [withoutEth] = withoutEthRes[0].split('@')
    const withEthRes = await client.account.getTokenBalances({}, false, { symbolLookup: false, includeEth: true })
    const [withEth] = withEthRes[0].split('@')
    expect(new BigNumber(withoutEth).toNumber()).toStrictEqual(new BigNumber(withEth).toNumber())
  })

  it('should (duo-diff) Transfer Domain from EVM to DVM and DVM to EVM', async () => {
    // transfer some to evm first
    await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.EVM
        }
      }
    ])
    await container.generate(1)

    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')

    // start
    const txid = await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: `${Transfer.FOUR}@DFI`,
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: `${Transfer.FOUR}@DFI`,
          domain: TransferDomainType.EVM
        }
      },
      {
        src: {
          address: evmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.EVM
        },
        dst: {
          address: dvmAddr,
          amount: `${Transfer.THREE}@DFI`,
          domain: TransferDomainType.DVM
        }
      }
    ])
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)

    await container.generate(1)

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)
    expect(new BigNumber(dvmBalance1).toNumber())
      .toStrictEqual(new BigNumber(dvmBalance0).plus(Transfer.THREE - Transfer.FOUR).toNumber())

    // check eth balance to be equal to zero
    const withoutEthRes = await client.account.getTokenBalances({}, false)
    const [withoutEth] = withoutEthRes[0].split('@')
    const withEthRes = await client.account.getTokenBalances({}, false, { symbolLookup: false, includeEth: true })
    const [withEth] = withEthRes[0].split('@')
    expect(new BigNumber(withoutEth).plus(Transfer.FOUR).toNumber()).toStrictEqual(new BigNumber(withEth).toNumber())
  })
})
