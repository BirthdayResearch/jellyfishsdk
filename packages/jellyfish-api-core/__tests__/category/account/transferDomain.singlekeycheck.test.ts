import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TransferDomainOptionalInfo, TransferDomainType } from '../../../src/category/account'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import BigNumber from 'bignumber.js'

describe('TransferDomain', () => {
  let legacyAddr: string
  let legacyEvmAddr: string
  let bech32Addr: string
  let bech32EvmAddr: string
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    await client.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/evm': 'true',
        'v0/params/feature/transferdomain': 'true'
      }
    })
    await container.generate(2)

    legacyAddr = await container.getNewAddress('legacy', 'legacy')
    legacyEvmAddr = (await container.call('addressmap', [legacyAddr, 1])).format.erc55

    bech32Addr = await container.getNewAddress('bech32', 'bech32')
    bech32EvmAddr = (await container.call('addressmap', [bech32Addr, 1])).format.erc55

    await container.call('utxostoaccount', [{ [legacyAddr]: '100000@0' }])
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('single key check restricted', () => {
    it('should fail as src key and dst key is different', async () => {
      const promise = client.account.transferDomain([
        {
          src: {
            address: legacyAddr,
            amount: '3@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: bech32EvmAddr,
            amount: '3@DFI',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Dst address does not match source key')
    })

    it('should transfer domain with same key', async () => {
      const legacyAccBefore = await client.account.getAccount(legacyAddr)
      const [value] = legacyAccBefore[0].split('@')
      const legacyBalanceBefore = new BigNumber(value)
      const evmBalanceBefore = await getEVMBalances(client)

      await client.account.transferDomain([
        {
          src: {
            address: legacyAddr,
            amount: '1@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: legacyEvmAddr,
            amount: '1@DFI',
            domain: TransferDomainType.EVM
          }
        }
      ])
      await container.generate(1)

      {
        const legacyAccAfter = await client.account.getAccount(legacyAddr)
        const [value] = legacyAccAfter[0].split('@')
        const legacyBalanceAfter = new BigNumber(value)
        expect(legacyBalanceAfter).toStrictEqual(legacyBalanceBefore.minus(1))

        const evmBalanceAfter = await getEVMBalances(client)
        expect(evmBalanceAfter).toStrictEqual(evmBalanceBefore.plus(1))
      }
    })

    it('should transfer domain with different key', async () => {
      const legacyAccBefore = await client.account.getAccount(legacyAddr)
      const [value] = legacyAccBefore[0].split('@')
      const legacyBalanceBefore = new BigNumber(value)
      const evmBalanceBefore = await getEVMBalances(client)

      await client.account.transferDomain([
        {
          src: {
            address: legacyAddr,
            amount: '2@DFI',
            domain: TransferDomainType.DVM
          },
          dst: {
            address: bech32EvmAddr,
            amount: '2@DFI',
            domain: TransferDomainType.EVM
          },
          singlekeycheck: false as unknown as TransferDomainOptionalInfo
        }
      ])
      await container.generate(1)

      {
        const legacyAccAfter = await client.account.getAccount(legacyAddr)
        const [value] = legacyAccAfter[0].split('@')
        const legacyBalanceAfter = new BigNumber(value)
        expect(legacyBalanceAfter).toStrictEqual(legacyBalanceBefore.minus(2))

        const evmBalanceAfter = await getEVMBalances(client)
        expect(evmBalanceAfter).toStrictEqual(evmBalanceBefore.plus(2))
      }
    })
  })
})

async function getEVMBalances (client: ContainerAdapterClient): Promise<BigNumber> {
  const ethRes = await client.account.getTokenBalances({}, false)
  const [eth] = ethRes[0].split('@')
  const withEthRes = await client.account.getTokenBalances({}, false, { symbolLookup: false, includeEth: true })
  const [withEth] = withEthRes[0].split('@')
  return new BigNumber(withEth).minus(eth)
}
