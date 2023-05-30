
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload, TransferDomainType } from '../../../src/category/account'
import BigNumber from 'bignumber.js'

describe('EVMTX', () => {
  let dfiAddress: string, ethAddress: string, toEthAddress: string
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const testing = Testing.create(container)
  const txGas = {
    gasPrice: 21,
    gasLimit: 21000
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: { 'v0/params/feature/evm': 'true' }
    })
    await container.generate(1)
    dfiAddress = await container.call('getnewaddress')
    await container.call('utxostoaccount', [{ [dfiAddress]: '105@DFI' }])
    await container.generate(1)
    ethAddress = await container.call('getnewaddress', ['', 'eth'])
    toEthAddress = await container.call('getnewaddress', ['', 'eth'])
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should verify that feature/evm gov attribute is set', async () => {
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES['v0/params/feature/evm']).toStrictEqual('true')
  })

  it('should successfully create a new EVM transaction', async () => {
    const amountToTransfer = 100
    const from: BalanceTransferPayload = {
      [dfiAddress]: `${amountToTransfer}@DFI`
    }
    const to: BalanceTransferPayload = {
      [ethAddress]: `${amountToTransfer}@DFI`
    }

    const balanceDFIAddressBefore: Record<string, BigNumber> = await client.call('getaccount', [dfiAddress, {}, true], 'bignumber')
    await container.call('transferdomain', [TransferDomainType.DVMTokenToEVM, from, to])
    await container.generate(1)

    const balanceDFIAddressAfter: Record<string, BigNumber> = await client.call('getaccount', [dfiAddress, {}, true], 'bignumber')
    expect(balanceDFIAddressAfter['0']).toStrictEqual(balanceDFIAddressBefore['0'].minus(amountToTransfer))

    const evmTxHash = await client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(1),
      nonce: 0,
      ...txGas
    })
    await container.generate(1)

    const blockHash: string = await client.blockchain.getBestBlockHash()
    const txs = await client.blockchain.getBlock(blockHash, 1)
    expect(txs.tx[1]).toStrictEqual(evmTxHash)
  })

  it('should successfully create a new EVM transaction with optional data', async () => {
    const evmTxHash = await client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(0.03),
      data: 'ad33eb89000000000000000000000000a218a0ea9a888e3f6e2dffdf4066885f596f07bf', // random methodId 0xad33eb89, random tokenAddr 000000000000000000000000a218a0ea9a888e3f6e2dffdf4066885f596f07bf
      nonce: 1,
      ...txGas
    })
    await container.generate(1)

    const blockHash: string = await client.blockchain.getBestBlockHash()
    const txs = await client.blockchain.getBlock(blockHash, 1)
    expect(txs.tx[1]).toStrictEqual(evmTxHash)
  })

  it('should fail creation of evmtx when amount is not valid', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(Number.MAX_VALUE),
      nonce: 2,
      ...txGas
    })).rejects.toThrow(new RpcApiError({ code: -3, method: 'evmtx', message: 'Invalid amount' }))
  })

  it('should fail creation of evmtx when from address is not a valid ethereum address', async () => {
    await expect(client.evm.evmtx({
      from: dfiAddress,
      to: ethAddress,
      value: new BigNumber(1),
      nonce: 2,
      ...txGas
    })).rejects.toThrow(new RpcApiError({ code: -8, method: 'evmtx', message: 'from address not an Ethereum address' }))
  })

  it('should fail creation of evmtx when to address is not a valid ethereum address', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: dfiAddress,
      value: new BigNumber(1),
      nonce: 2,
      ...txGas
    })).rejects.toThrow(new RpcApiError({ code: -8, method: 'evmtx', message: 'to address not an Ethereum address' }))
  })

  it('should fail creation of evmtx when nonce is not valid', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(1),
      nonce: 12345678,
      ...txGas
    })).rejects.toThrow(RpcApiError)
  })

  it('should fail creation of evmtx when gas price is not valid', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(1),
      nonce: 2,
      gasPrice: Number.MAX_VALUE,
      gasLimit: txGas.gasLimit
    })).rejects.toThrow(new RpcApiError({ code: -1, method: 'evmtx', message: 'JSON integer out of range' }))
  })

  it('should fail creation of evmtx when gas limit is not valid', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(1),
      nonce: 2,
      gasPrice: txGas.gasPrice,
      gasLimit: Number.MAX_VALUE
    })).rejects.toThrow(new RpcApiError({ code: -1, method: 'evmtx', message: 'JSON integer out of range' }))
  })
})
