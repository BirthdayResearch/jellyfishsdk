import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload, TransferDomainType } from '../../../src/category/account'
import { RpcApiError } from '@defichain/jellyfish-api-core/dist/index'
import BigNumber from 'bignumber.js'

describe('TransferDomain', () => {
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
    await createToken(dfiAddress, 'BTC', 200)
    await container.generate(1)
    ethAddress = await container.getNewAddress('', 'eth')
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
    await container.waitForWalletBalanceGTE(101)
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('utxostoaccount', [{ [address]: '100@0' }])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  it('should fail Transfer Domain from DFC to EVM if type is string', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer + 1}@DFI`
    }
    // To skip typescript validation in order to assert invalid query parameter
    // @ts-expect-error
    const promise = client.account.transferDomain('blabla', from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('expected type number, got string')
  })

  it('should fail Transfer Domain from DFC to EVM if type is invalid', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferDomain(0, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid parameters, argument "type" must be either 1 (DFI token to EVM) or 2 (EVM to DFI token)')
  })

  it('should fail Transfer Domain from DFC to EVM if from Address is invalid', async () => {
    const from: BalanceTransferPayload = {
      invalidAddress: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.DVMTokenToEVM, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('recipient (invalidAddress) does not refer to any valid address')
  })

  it('should fail Transfer Domain from DFC to EVM if to Address is invalid', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      invalidAddress: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.DVMTokenToEVM, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('recipient (invalidAddress) does not refer to any valid address')
  })

  it('should fail Transfer Domain from DFC to EVM if from Address is not a DFI address', async () => {
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.DVMTokenToEVM, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('From address must not be an ETH address in case of "evmin" transfer type')
  })

  it('should fail Transfer Domain from DFC to EVM if to Address is not eth address', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.DVMTokenToEVM, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('To address must be an ETH address in case of "evmin" transfer type')
  })

  it('should fail Transfer Domain from DFC to EVM if from and to value is different', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.DVMTokenToEVM, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('sum of inputs (from) != sum of outputs (to)')
  })

  it('should fail Transfer Domain from DFC to EVM if from and to value is different tokens', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@BTC`
    }
    const promise = client.account.transferDomain(TransferDomainType.DVMTokenToEVM, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('sum of inputs (from) != sum of outputs (to)')
  })

  it('should fail Transfer Domain from DFC to EVM if transferring unsupported tokens', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@BTC`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@BTC`
    }
    const promise = client.account.transferDomain(TransferDomainType.DVMTokenToEVM, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('For "evmin" transfers, only DFI token is currently supported')
  })

  it('should fail Transfer Domain from DFC to EVM if not enough balance', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: '1000@DFI'
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: '1000@DFI'
    }
    const promise = client.account.transferDomain(TransferDomainType.DVMTokenToEVM, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('not enough balance on owner\'s account')
  })

  it('should Transfer Domain from DFC to EVM', async () => {
    const tokenBalances = await client.account.getAccount(dfiAddress)
    const [initialBalance, tokenId] = tokenBalances[0].split('@')
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const data = await client.account.transferDomain(TransferDomainType.DVMTokenToEVM, from, to)
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

  it('should fail Transfer Domain from EVM to DFC if from Address is invalid', async () => {
    const from: BalanceTransferPayload = {
      invalidAddress: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.EVMToDVMToken, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('recipient (invalidAddress) does not refer to any valid address')
  })

  it('should fail Transfer Domain from EVM to DFC if to Address is invalid', async () => {
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      invalidAddress: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.EVMToDVMToken, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('recipient (invalidAddress) does not refer to any valid address')
  })

  it('should fail Transfer Domain from EVM to DFC if from Address is not eth address', async () => {
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.EVMToDVMToken, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('From address must be an ETH address in case of "evmout" transfer type')
  })

  it('should fail Transfer Domain from EVM to DFC if to Address is not a DFI address', async () => {
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.EVMToDVMToken, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('To address must not be an ETH address in case of "evmout" transfer type')
  })

  it('should fail Transfer Domain from EVM to DFC if from and to value is different', async () => {
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer + 1}@DFI`
    }
    const promise = client.account.transferDomain(TransferDomainType.EVMToDVMToken, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('sum of inputs (from) != sum of outputs (to)')
  })

  it('should fail Transfer Domain from EVM to DFC if from and to value is different tokens', async () => {
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@BTC`
    }
    const promise = client.account.transferDomain(TransferDomainType.EVMToDVMToken, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('sum of inputs (from) != sum of outputs (to)')
  })

  it('should fail Transfer Domain from EVM to DFC if transferring unsupported tokens', async () => {
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@BTC`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@BTC`
    }
    const promise = client.account.transferDomain(TransferDomainType.EVMToDVMToken, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('For "evmout" transfers, only DFI token is currently supported')
  })

  it('should fail Transfer Domain from EVM to DFC if not enough balance', async () => {
    const from: BalanceTransferPayload = {
      [ethAddress]: '1000@DFI'
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: '1000@DFI'
    }
    const promise = client.account.transferDomain(TransferDomainType.EVMToDVMToken, from, to)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Not enough balance in ${ethAddress} to cover "evmout" transfer`)
  })

  it('should Transfer Domain from EVM to DFC', async () => {
    const tokenBalances = await client.account.getAccount(dfiAddress)
    const [initialBalance, tokenId] = tokenBalances[0].split('@')
    const from: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const data = await client.account.transferDomain(TransferDomainType.EVMToDVMToken, from, to)
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
