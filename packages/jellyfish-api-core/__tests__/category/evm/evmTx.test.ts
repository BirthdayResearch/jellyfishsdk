
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BalanceTransferPayload, TransferDomainType } from '../../../src/category/account'
import BigNumber from 'bignumber.js'

describe('EVMTX', () => {
  let dfiAddress: string, ethAddress: string
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({
      ATTRIBUTES: { 'v0/params/feature/evm': 'true' }
    })
    await container.generate(1)
    dfiAddress = await container.call('getnewaddress')
    await container.call('utxostoaccount', [{ [dfiAddress]: '10@DFI' }])
    await container.generate(1)
    ethAddress = await container.call('getnewaddress', ['', 'eth'])
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should verify that feature/evm gov attribute is set', async () => {
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES['v0/params/feature/evm']).toStrictEqual('true')
  })

  it('should create a new EVM transaction', async () => {
    const amountToTransfer = 2
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

    // Create EVM transaction and submit to local node
    const toEthAddress = await container.call('getnewaddress', ['', 'eth'])
    const evmTxHash = await client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      nonce: 0,
      gasPrice: 21,
      gasLimit: 21000,
      value: new BigNumber(1)
      // data: '0x00'
    })
    await container.generate(1)

    const blockHash: string = await client.blockchain.getBestBlockHash()
    const txs = await client.blockchain.getBlock(blockHash, 1)
    expect(txs.tx[1]).toStrictEqual(evmTxHash)
  })

  it('should fail creation of evmtx when balance is not enough', async () => {
    const toEthAddress = await container.call('getnewaddress', ['', 'eth'])

    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      nonce: 0,
      gasPrice: 21,
      gasLimit: 21000,
      value: new BigNumber(10)
    })).rejects.toThrow(RpcApiError)
  })

  it('should fail creation of evmtx when ethereum address is not valid', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: dfiAddress,
      nonce: 0,
      gasPrice: 21,
      gasLimit: 21000,
      value: new BigNumber(1)
    })).rejects.toThrow(RpcApiError)
  })
})
