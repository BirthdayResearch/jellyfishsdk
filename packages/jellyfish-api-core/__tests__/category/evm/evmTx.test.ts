
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('EVMTX', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should create a new EVM transaction', async () => {
    const from = await container.call('getnewaddress')
    const ethAddress = await container.call('getnewaddress', ['', 'eth'])
    const toEthAddress = await container.call('getnewaddress', ['', 'eth'])

    // Topup DFI and ETH addresses
    await container.waitForWalletBalanceGTE(3)
    await container.call('utxostoaccount', [{ [from]: '3@DFI' }])
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/evm': 'true' } })
    await container.generate(1)

    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES['v0/params/feature/evm']).toStrictEqual('true')

    const balanceDFIAddressBefore: Record<string, BigNumber> = await client.call('getaccount', [from, {}, true], 'bignumber')
    await container.call('transferbalance', ['evmin', { [from]: '2@DFI' }, { [ethAddress]: '2@DFI' }])
    await container.generate(1)

    const balanceDFIAddressAfter: Record<string, BigNumber> = await client.call('getaccount', [from, {}, true], 'bignumber')
    expect(balanceDFIAddressAfter['0']).toStrictEqual(balanceDFIAddressBefore['0'].minus(2))

    // Create EVM transaction and submit to local node
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

    // TODO (lyka): Check the tx data from EVM
  })

  it('should fail creation of evmtx when balance is not enough', async () => {
    const ethAddress = await container.call('getnewaddress', ['', 'eth'])
    const toEthAddress = await container.call('getnewaddress', ['', 'eth'])

    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      nonce: 0,
      gasPrice: 10,
      gasLimit: 10000,
      value: new BigNumber(5)
    }))
      .rejects.toThrow(RpcApiError)
  })

  it('should fail creation of evmtx when ethereum address is not valid', async () => {
    const fromAddress = await container.call('getnewaddress', [''])
    const toAddress = await container.call('getnewaddress', [''])

    await expect(client.evm.evmtx({
      from: fromAddress,
      to: toAddress,
      nonce: 0,
      gasPrice: 10,
      gasLimit: 10000,
      value: new BigNumber(5)
    }))
      .rejects.toThrow(RpcApiError)
  })
})
