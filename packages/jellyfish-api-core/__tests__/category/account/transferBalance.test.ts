import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload, TransferBalanceType } from '../../../src/category/account'
import { RpcApiError } from '@defichain/jellyfish-api-core/dist/index'
import BigNumber from 'bignumber.js'

describe('TransferBalance', () => {
  let dfiAddress: string, ethAddress: string
  const amountToTransfer = 5
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
    dfiAddress = await container.call('getnewaddress')
    // transfer utxostoaccount
    await container.call('utxostoaccount', [{ [dfiAddress]: '100@0' }])
    await container.generate(1)
    ethAddress = await container.getNewAddress('', 'eth')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should fail Transfer Balance from DFC to EVM if input and output value is different', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferBalance(TransferBalanceType.EvmIn, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('sum of inputs (from) != sum of outputs (to)')
  })

  it('should Transfer Balance from DFC to EVM', async () => {
    const tokenBalances = await client.account.getAccount(dfiAddress)
    const [initialBalance, tokenId] = tokenBalances[0].split('@')
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const data = await client.account.transferBalance(TransferBalanceType.EvmIn, from, to)
    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)
    await container.generate(1)
    const updatedTokenBalances = await client.account.getAccount(dfiAddress)
    const [updatedBalance, id] = updatedTokenBalances[0].split('@')
    expect(id).toStrictEqual(tokenId)
    expect(new BigNumber(updatedBalance).toNumber())
      .toStrictEqual(new BigNumber(initialBalance).minus(amountToTransfer).toNumber())

    // check eth balance to be equal to amountToTransfer
    const withoutEthBalanceRes = await client.account.getTokenBalances({}, false, { symbolLookup: false }, false)
    const [withoutEthBalance] = withoutEthBalanceRes[0].split('@')
    const withEthBalanceRes = await client.account.getTokenBalances({}, false, { symbolLookup: false }, true)
    const [withEthBalance] = withEthBalanceRes[0].split('@')
    expect(new BigNumber(withoutEthBalance).toNumber())
      .toStrictEqual(new BigNumber(withEthBalance).minus(amountToTransfer).toNumber())
  })

  it('should fail Transfer Balance from EVM to DFC if input and output value is different', async () => {
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferBalance(TransferBalanceType.EvmOut, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('sum of inputs (from) != sum of outputs (to)')
  })

  it('should Transfer Balance from EVM to DFC', async () => {
    const tokenBalances = await client.account.getAccount(dfiAddress)
    const [initialBalance, tokenId] = tokenBalances[0].split('@')
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const data = await client.account.transferBalance(TransferBalanceType.EvmOut, from, to)
    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)
    await container.generate(1)
    const updatedTokenBalances = await client.account.getAccount(dfiAddress)
    const [updatedBalance, id] = updatedTokenBalances[0].split('@')
    expect(id).toStrictEqual(tokenId)
    expect(new BigNumber(updatedBalance).toNumber())
      .toStrictEqual(new BigNumber(initialBalance).plus(amountToTransfer).toNumber())

    // check eth balance to be equal to zero
    const withoutEthBalanceRes = await client.account.getTokenBalances({}, false, { symbolLookup: false }, false)
    const [withoutEthBalance] = withoutEthBalanceRes[0].split('@')
    const withEthBalanceRes = await client.account.getTokenBalances({}, false, { symbolLookup: false }, true)
    const [withEthBalance] = withEthBalanceRes[0].split('@')
    expect(new BigNumber(withoutEthBalance).toNumber()).toStrictEqual(new BigNumber(withEthBalance).toNumber())
  })
})
