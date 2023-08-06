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
        'v0/transferdomain/dvm-evm/dat-enabled': 'true',
        'v0/transferdomain/evm-dvm/dat-enabled': 'true'
      }
    })
    await container.generate(1)

    dvmAddr = await container.getNewAddress('address1', 'legacy')
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
    await container.call('createtoken', [{
      symbol: 'ETH',
      name: 'ETH',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: dvmAddr
    }])
    await container.generate(1)

    await container.call('minttokens', ['10@BTC'])
    await container.call('minttokens', ['10@ETH'])
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
  })

  it('should Transfer Domain from DVM to EVM', async () => {
    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')
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

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)

    // check: dvm balance is transferred
    expect(new BigNumber(dvmBalance0))
      .toStrictEqual(new BigNumber(dvmBalance1).plus(3))

    // check: evm balance = dvm balance - transferred
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).minus(3))
  })

  it('should Transfer Domain dToken from DVM to EVM', async () => {
    const dvmAcc = (await client.account.getAccount(dvmAddr))
    const [btcBalance, btcTokenId] = dvmAcc[1]?.split('@')
    const [ethBalance, ethTokenId] = dvmAcc[2].split('@')
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

    const dvmAcc1 = await client.account.getAccount(dvmAddr)

    const [btcBalance1, btcTokenId1] = dvmAcc1[1]?.split('@')
    const [ethBalance1, ethTokenId1] = dvmAcc1[2].split('@')
    expect(btcTokenId).toStrictEqual(btcTokenId1)
    expect(ethTokenId).toStrictEqual(ethTokenId1)

    // check: BTC balance is transferred
    expect(new BigNumber(btcBalance1))
      .toStrictEqual(new BigNumber(btcBalance).minus(3))
    // check: ETH balance is transferred
    expect(new BigNumber(ethBalance1))
      .toStrictEqual(new BigNumber(ethBalance).minus(3))
  })

  it('should Transfer Domain from EVM to DVM', async () => {
    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')
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

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)
    expect(new BigNumber(dvmBalance0))
      .toStrictEqual(new BigNumber(dvmBalance1).minus(3))

    // check EVM balance
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).plus(3))
  })

  it('should (duo) Transfer Domain from DVM to EVM', async () => {
    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')
    const prevBalance = await getEVMBalances(client)

    const txid1 = await client.account.transferDomain([
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
    expect(typeof txid1).toStrictEqual('string')
    expect(txid1.length).toStrictEqual(64)
    const txid2 = await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: '4@DFI',
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: '4@DFI',
          domain: TransferDomainType.EVM
        }
      }
    ])
    expect(typeof txid2).toStrictEqual('string')
    expect(txid2.length).toStrictEqual(64)
    await container.generate(1)

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)

    // check: dvm balance is transferred
    expect(new BigNumber(dvmBalance0))
      .toStrictEqual(new BigNumber(dvmBalance1).plus(3 + 4))

    // check EVM balance
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).minus(3 + 4))
  })

  it('should (duo) Transfer Domain from EVM to DVM', async () => {
    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')
    const prevBalance = await getEVMBalances(client)

    const txid1 = await client.account.transferDomain([
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
    expect(typeof txid1).toStrictEqual('string')
    expect(txid1.length).toStrictEqual(64)
    const txid2 = await client.account.transferDomain([
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
    expect(typeof txid2).toStrictEqual('string')
    expect(txid2.length).toStrictEqual(64)
    await container.generate(1)

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)
    expect(new BigNumber(dvmBalance0))
      .toStrictEqual(new BigNumber(dvmBalance1).minus(3 + 4))

    // check EVM balance
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).plus(3 + 4))
  })

  it('should (duo-diff) Transfer Domain from EVM to DVM and DVM to EVM', async () => {
    // transfer some to evm first
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

    const dvmAcc = await client.account.getAccount(dvmAddr)
    const [dvmBalance0, tokenId0] = dvmAcc[0].split('@')
    const prevBalance = await getEVMBalances(client)

    // start
    const txid1 = await client.account.transferDomain([
      {
        src: {
          address: dvmAddr,
          amount: '4@DFI',
          domain: TransferDomainType.DVM
        },
        dst: {
          address: evmAddr,
          amount: '4@DFI',
          domain: TransferDomainType.EVM
        }
      }
    ])
    expect(typeof txid1).toStrictEqual('string')
    expect(txid1.length).toStrictEqual(64)
    const txid2 = await client.account.transferDomain([
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
    expect(typeof txid2).toStrictEqual('string')
    expect(txid2.length).toStrictEqual(64)

    await container.generate(1)

    const dvmAcc1 = await client.account.getAccount(dvmAddr)
    const [dvmBalance1, tokenId1] = dvmAcc1[0].split('@')
    expect(tokenId1).toStrictEqual(tokenId0)

    expect(new BigNumber(dvmBalance1))
      .toStrictEqual(new BigNumber(dvmBalance0).plus(3 - 4))

    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).plus(3 - 4))
  })
})

async function getEVMBalances (client: ContainerAdapterClient): Promise<BigNumber> {
  const withoutEthRes = await client.account.getTokenBalances({}, false)
  const [withoutEth] = withoutEthRes[0].split('@')
  const withEthRes = await client.account.getTokenBalances({}, false, { symbolLookup: false, includeEth: true })
  const [withEth] = withEthRes[0].split('@')
  return new BigNumber(withEth).minus(withoutEth)
}
