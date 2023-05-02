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
    dfiAddress = await container.call('getnewaddress')
    // transfer utxostoaccount
    await container.call('utxostoaccount', [{ [dfiAddress]: '100@0' }])
    await container.generate(1)
    ethAddress = await container.getNewAddress('', 'eth')
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should Transfer Balance from DFC to EVM', async () => {
    const tokenBalances = await client.account.getTokenBalances()
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
    const updatedTokenBalances = await client.account.getTokenBalances()
    const [updatedBalance, id] = updatedTokenBalances[0].split('@')
    expect(id).toStrictEqual(tokenId)
    expect(new BigNumber(updatedBalance).toNumber())
      .toStrictEqual(new BigNumber(initialBalance).minus(amountToTransfer).toNumber())
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

  it('should Transfer Balance from EVM to DFC', async () => {
    const tokenBalances = await client.account.getTokenBalances()
    const [initialBalance, tokenId] = tokenBalances[0].split('@')
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }

    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const data = await client.account.transferBalance(TransferBalanceType.EvmIn, from, to)
    expect(typeof data).toStrictEqual('string')
    expect(data.length).toStrictEqual(64)
    await container.generate(1)
    const updatedTokenBalances = await client.account.getTokenBalances()
    const [updatedBalance, id] = updatedTokenBalances[0].split('@')
    expect(id).toStrictEqual(tokenId)
    expect(new BigNumber(updatedBalance).toNumber())
      .toStrictEqual(new BigNumber(initialBalance).plus(amountToTransfer).toNumber())
  })

  it('should fail Transfer Balance from EVM to DFC if input and output value is different', async () => {
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferBalance(TransferBalanceType.EvmIn, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('sum of inputs (from) != sum of outputs (to)')
  })

  // it('should not accountToAccount for DFI coin if does not own the recipient address', async () => {
  //   const promise = client.account.accountToAccount(from, { '2Mywjs9zEU4NtLknXQJZgozaxMvPn2Bb3qz': '5@DFI' })

  //   await expect(promise).rejects.toThrow(RpcApiError)
  //   await expect(promise).rejects.toThrow('The address (2Mywjs9zEU4NtLknXQJZgozaxMvPn2Bb3qz) is not your own address')
  // })

  // it('should accountToAccount with utxos', async () => {
  //   const { txid } = await container.fundAddress(from, 10)

  //   const payload: BalanceTransferPayload = {}
  //   payload[await container.getNewAddress()] = '5@DFI'
  //   payload[await container.getNewAddress()] = '5@DBTC'
  //   payload[await container.getNewAddress()] = '5@DETH'

  //   const utxos = await container.call('listunspent')
  //   const inputs: UTXO[] = utxos.filter((utxo: UTXO) => utxo.txid === txid).map((utxo: UTXO) => {
  //     return {
  //       txid: utxo.txid,
  //       vout: utxo.vout
  //     }
  //   })

  //   const data = await client.account.accountToAccount(from, payload, { utxos: inputs })

  //   expect(typeof data).toStrictEqual('string')
  //   expect(data.length).toStrictEqual(64)
  // })
})
