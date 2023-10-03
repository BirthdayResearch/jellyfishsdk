import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TransferDomainType } from '../../../src/category/account'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import BigNumber from 'bignumber.js'

describe('TransferDomain', () => {
  let dvmAddr: string, evmAddr: string, p2shAddr: string
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
        'v0/transferdomain/evm-dvm/dat-enabled': 'true',
        'v0/transferdomain/dvm-evm/src-formats': ['p2pkh', 'bech32'],
        'v0/transferdomain/dvm-evm/dest-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/src-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/auth-formats': ['bech32-erc55'],
        'v0/transferdomain/evm-dvm/dest-formats': ['p2pkh', 'bech32']
      }
    })
    await container.generate(2)

    dvmAddr = await container.getNewAddress('address1', 'legacy')
    evmAddr = await container.getNewAddress('erc55', 'erc55')

    p2shAddr = await container.getNewAddress('address', 'p2sh-segwit')

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

    // Create LP tokens
    const metadata = {
      tokenA: 'DFI',
      tokenB: 'BTC',
      commission: 1,
      status: true,
      ownerAddress: dvmAddr
    }
    await client.poolpair.createPoolPair(metadata)
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
    it('(dvm -> evm) should fail if src address is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: 'invalid', // invalid
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
      await expect(promise).rejects.toThrow('Invalid src address provided')
    })

    it('(dvm -> evm) should fail if dst address is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: 'invalid', // invalid
            amount: '3@DFI',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Invalid dst address provided')
    })

    it('(evm -> dvm) should fail if src address is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: 'invalid', // invalid
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Invalid dst address provided')
    })

    it('(evm -> dvm) should fail if dst address is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: 'invalid', // invalid
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Invalid dst address provided')
    })

    it('(dvm -> evm) should fail if src address is not legacy or Bech32 address in case of "DVM" domain', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: p2shAddr, // <- non legacy or Bech32 addres
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
      await expect(promise).rejects.toThrow('Src address must be a legacy or Bech32 address in case of "DVM" domain')
    })

    it('(evm -> dvm) should fail if dst address is not legacy or Bech32 address in case of "DVM" domain', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '1@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: p2shAddr, // <- non legacy or Bech32 addres
            amount: '1@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Dst address must be a legacy or Bech32 address in case of "DVM" domain')
    })

    it('(dvm -> evm) should fail if dst address is not ERC55 address in case of "EVM" domain', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: dvmAddr, // <- not a valid ERC55 address
            amount: '3@DFI',
            domain: TransferDomainType.EVM

          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Failed to create and sign TX: Invalid address')
    })

    it('(evm -> dvm) should fail if src address is not ERC55 address in case of "EVM" domain', async () => {
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

    it('(dvm -> evm) should fail if amount value is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: 'invalid@DFI', // invalid amount
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: 'invalid@DFI', // invalid amount
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Invalid amount')
    })

    it('(evm -> dvm) should fail if amount value is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: 'invalid@DFI', // invalid amount
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: 'invalid@DFI', // invalid amount
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Invalid amount')
    })

    it('(dvm -> evm) should fail if amount symbol is different', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI', // not match
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '3@BTC', // not match
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Source token and destination token must be the same')
    })

    it('(evm -> dvm) should fail if amount symbol is different', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '3@DFI', // not match
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: '3@BTC', // not match
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Source token and destination token must be the same')
    })

    it('(dvm -> evm) should fail if amount value is different', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '2@DFI', // not match
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '3@DFI', // not match
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Source amount must be equal to destination amount')
    })

    it('(evm -> dvm) should fail if amount value is different', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '2@DFI', // not match
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: '3@BTC', // not match
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Source amount must be equal to destination amount')
    })

    it('(dvm -> evm) should fail if negative amount', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '-1@DFI', // invalid
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '-1@DFI', // invalid
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
            amount: '-1@DFI', // invalid
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: '-1@DFI', // invalid
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Amount out of range')
    })

    it('(dvm -> invalid) should fail if dst domain is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM

          },
          dst: {
            address: evmAddr,
            amount: '3@DFI',
            domain: 1 // invalid
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Unknown transfer domain aspect')
    })

    it('(invalid -> dvm) should fail if src domain is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: 1 // invalid

          },
          dst: {
            address: evmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Invalid parameters, src argument "domain" must be either 2 (DFI token to EVM) or 3 (EVM to DFI token)')
    })

    it('(evm -> invalid) should fail if dst domain is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: evmAddr,
            amount: '3@DFI',
            domain: 1 // invalid
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Unknown transfer domain aspect')
    })

    it('(invalid -> evm) should fail if src domain is invalid', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: 1 // invalid
          },
          dst: {
            address: evmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Invalid parameters, src argument "domain" must be either 2 (DFI token to EVM) or 3 (EVM to DFI token)')
    })

    it('(dvm -> dvm) should fail if transfer within same domain', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM // same domain
          },
          dst: {
            address: dvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM // same domain
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Failed to create and sign TX: Invalid address')
    })

    it('(evm -> evm) should fail if transfer within same domain', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM // same domain
          },
          dst: {
            address: evmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM // same domain
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Cannot transfer inside same domain')
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

    it('(evm -> dvm) should not fail if insufficient balance but tx remained in mempool', async () => {
      const txid = await client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '99999999@DFI',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: '99999999@DFI',
            domain: TransferDomainType.DVM
          }
        }
      ])
      const mempool: string[] = await container.call('getrawmempool')
      await container.generate(1)
      const found = mempool.find((m: string) => m === txid)
      expect(found).toBeDefined()

      await container.call('clearmempool')
    })

    it('(dvm -> evm) should fail if custom (isDAT = false) token is transferred', async () => {
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

    it('(evm -> dvm) should fail if custom (isDAT = false) token is transferred', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '3@DESC#128',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: '3@DESC#128',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Non-DAT or LP tokens are not supported for transferdomain')
    })

    it('(dvm -> evm) should fail if LP token is transferred', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: dvmAddr,
            amount: '10@DFI-BTC',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: evmAddr,
            amount: '10@DFI-BTC',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(
        "RpcApiError: 'Test TransferDomainTx execution failed:\n" +
        "Non-DAT or LP tokens are not supported for transferdomain', code: -32600, method: transferdomain"
      )
    })

    it('(evm -> dvm) should fail if LP token is transferred', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: evmAddr,
            amount: '10@DFI-BTC',
            domain: TransferDomainType.EVM
          },
          dst: {
            address: dvmAddr,
            amount: '10@DFI-BTC',
            domain: TransferDomainType.DVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(
        "RpcApiError: 'Test TransferDomainTx execution failed:\n" +
        "Non-DAT or LP tokens are not supported for transferdomain', code: -32600, method: transferdomain"
      )
    })

    it('(dvm -> evm) should fail if (duo) transfer domain', async () => {
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

    it('(evm -> dvm) should fail if (duo) transfer domain', async () => {
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
    expect(new BigNumber(dvmBalance0))
      .toStrictEqual(new BigNumber(dvmBalance1).plus(3))

    // check: evm balance = dvm balance - transferred
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).minus(3))
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
    expect(new BigNumber(dvmBalance0))
      .toStrictEqual(new BigNumber(dvmBalance1).minus(3))

    // check EVM balance
    const currentBalance = await getEVMBalances(client)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).plus(3))
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
    expect(new BigNumber(btcBalance1))
      .toStrictEqual(new BigNumber(btcBalance).minus(3))
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
    expect(new BigNumber(btcBalance1))
      .toStrictEqual(new BigNumber(btcBalance).plus(3))
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
    expect(new BigNumber(dvmBalance1))
      .toStrictEqual(new BigNumber(dvmBalance0).minus(3))
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
    expect(new BigNumber(dvmBalance1))
      .toStrictEqual(new BigNumber(dvmBalance0).plus(3))
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
    await container.generate(10)
  }

  { // Take Loan
    await container.call('takeloan', [{
      vaultId: vaultId,
      amounts: '30@AAPL'
    }])
    await container.generate(1)
  }
}

async function getAccountValues (client: ContainerAdapterClient, address: string): Promise<{ [symbol: string]: string }> {
  const values = await client.account.getAccount(address)
  return values.reduce((res: { [symbol: string]: string }, current: string) => {
    const [value, symbol] = current.split('@')
    return {
      ...res,
      [symbol]: value
    }
  }, {})
}
