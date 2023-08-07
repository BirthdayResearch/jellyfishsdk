import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TransferDomainType } from '../../../src/category/account'
import BigNumber from 'bignumber.js'

describe('EVM feature flags', () => {
  let dvmAddr: string, evmAddr: string
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  async function dvmToEvmTransferDomain (): Promise<string> {
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
    return txid
  }

  async function evmToDvmTransferDomain (): Promise<string> {
    const txid = await client.account.transferDomain([
      {
        src: {
          address: evmAddr,
          amount: '2@DFI',
          domain: TransferDomainType.EVM

        },
        dst: {
          address: dvmAddr,
          amount: '2@DFI',
          domain: TransferDomainType.DVM
        }
      }
    ])
    return txid
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    dvmAddr = await container.getNewAddress('dfiAddress', 'legacy')
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
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('all gov attrs for EVM is set to false', () => {
    beforeAll(async () => {
      await client.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/feature/evm': 'false',
          'v0/params/feature/transferdomain': 'false',
          'v0/transferdomain/dvm-evm/enabled': 'false',
          'v0/transferdomain/evm-dvm/enabled': 'false'
        }
      })
      await container.generate(1)
    })

    it('should still successfully get eth address', async () => {
      const newEvmAddr = await container.getNewAddress('eth', 'eth')
      expect(newEvmAddr).toBeDefined()
    })

    it.only('should still successfully get eth balance', async () => {
      const dvmBalances = await client.account.getTokenBalances({}, false)
      const [dvmBalance] = dvmBalances[0].split('@')
      const evmBalances = await client.account.getTokenBalances({}, false, { includeEth: true })
      const [evmBalance] = evmBalances[0].split('@')
      expect(evmBalance).toBeDefined()
      expect(new BigNumber(dvmBalance).minus(new BigNumber(evmBalance)))
        .toStrictEqual(new BigNumber(0))
    })
  })

  describe('all gov attrs for EVM is set to true', () => {
    beforeAll(async () => {
      await client.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/feature/evm': 'true',
          'v0/params/feature/transferdomain': 'true',
          'v0/transferdomain/dvm-evm/enabled': 'true',
          'v0/transferdomain/evm-dvm/enabled': 'true'
        }
      })
      await container.generate(1)
    })

    it('should successfully transfer domain from DVM to EVM', async () => {
      const txid = await dvmToEvmTransferDomain()
      await container.generate(1)
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
    })

    it('should successfully transfer domain from EVM to DVM', async () => {
      const txid = await evmToDvmTransferDomain()
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
    })
  })

  describe('gov attr v0/params/feature/evm is set to false', () => {
    beforeAll(async () => {
      await client.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/feature/evm': 'false',
          'v0/params/feature/transferdomain': 'true'
        }
      })
      await container.generate(1)
    })

    it('should fail DVM to EVM transferDomain', async () => {
      const promise = dvmToEvmTransferDomain()
      await expect(promise).rejects.toThrow('Cannot create tx, EVM is not enabled')
    })

    it('should fail EVM to DVM transferDomain', async () => {
      const promise = evmToDvmTransferDomain()
      await expect(promise).rejects.toThrow('Cannot create tx, EVM is not enabled')
    })
  })

  describe('gov attr v0/params/feature/transferdomain is set to false', () => {
    beforeAll(async () => {
      await client.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/feature/evm': 'true',
          'v0/params/feature/transferdomain': 'false'
        }
      })
      await container.generate(1)
    })

    it('should fail DVM to EVM transferDomain', async () => {
      const promise = dvmToEvmTransferDomain()
      await expect(promise).rejects.toThrow('Cannot create tx, transfer domain is not enabled')
    })

    it('should fail EVM to DVM transferDomain', async () => {
      const promise = evmToDvmTransferDomain()
      await expect(promise).rejects.toThrow('Cannot create tx, transfer domain is not enabled')
    })
  })

  describe('gov attr v0/transferdomain/dvm-evm/enabled is set to false', () => {
    beforeAll(async () => {
      await client.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/feature/evm': 'true',
          'v0/params/feature/transferdomain': 'true',
          'v0/transferdomain/evm-dvm/enabled': 'true',
          'v0/transferdomain/dvm-evm/enabled': 'false' // disabled dvm-evm
        }
      })
      await container.generate(1)
    })

    it('should not allow DVM to EVM transferDomain', async () => {
      const promise = dvmToEvmTransferDomain()
      await expect(promise).rejects.toThrow('DVM to EVM is not currently enabled')
    })

    it('should allow EVM to DVM transferDomain', async () => {
      const txid = await evmToDvmTransferDomain()
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
    })
  })

  describe('gov attr v0/transferdomain/evm-dvm/enabled is set to false', () => {
    beforeAll(async () => {
      await client.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/feature/evm': 'true',
          'v0/params/feature/transferdomain': 'true',
          'v0/transferdomain/dvm-evm/enabled': 'true',
          'v0/transferdomain/evm-dvm/enabled': 'false' // disabled evm-dvm
        }
      })
      await container.generate(1)
    })

    it('should not allow EVM to DVM transferDomain', async () => {
      const promise = evmToDvmTransferDomain()
      await expect(promise).rejects.toThrow('EVM to DVM is not currently enabled')
    })

    it('should allow DVM to EVM transferDomain', async () => {
      const txid = await dvmToEvmTransferDomain()
      expect(typeof txid).toStrictEqual('string')
      expect(txid.length).toStrictEqual(64)
    })
  })

  describe('gov attrs v0/transferdomain/dvm-evm/enabled and v0/transferdomain/evm-dvm/enabled are both set to false', () => {
    beforeAll(async () => {
      await client.masternode.setGov({
        ATTRIBUTES: {
          'v0/params/feature/evm': 'true',
          'v0/params/feature/transferdomain': 'true',
          'v0/transferdomain/dvm-evm/enabled': 'false', // disabled dvm-evm
          'v0/transferdomain/evm-dvm/enabled': 'false' // disabled evm-dvm
        }
      })
      await container.generate(1)
    })

    it('should not allow EVM to DVM transferDomain', async () => {
      const promise = evmToDvmTransferDomain()
      await expect(promise).rejects.toThrow('EVM to DVM is not currently enabled')
    })

    it('should not allow DVM to EVM transferDomain', async () => {
      const promise = dvmToEvmTransferDomain()
      await expect(promise).rejects.toThrow('DVM to EVM is not currently enabled')
    })
  })
})
