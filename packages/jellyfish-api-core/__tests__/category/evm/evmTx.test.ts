
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe.only('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should create a new EVM transaction', async () => {
    const from = await container.call('getnewaddress')
    const ethAddress = await container.getNewAddress('', 'eth')
    const toEthAddress = await container.getNewAddress('', 'eth')

    // Topup DFI and ETH addresses
    await container.call('utxostoaccount', [{ [from]: '101@DFI' }])
    // await client.account.transferBalance(TransferBalanceType.EvmIn, { [from]: '100@DFI' }, { [ethAddress]: '100@DFI' }) // TODO (lyka): Dependent of transferBalance changes

    // Create EVM transaction and submit to local node
    const evmTxHash = await client.blockchain.evmtx({
      from: ethAddress,
      to: toEthAddress,
      nonce: 0,
      gasPrice: 21,
      gasLimit: 21000,
      value: new BigNumber(0.1)
    })
    await container.generate(1)

    const blockHash = await client.blockchain.getBestBlockHash()
    const txs = await client.blockchain.getBlock(blockHash, 1)

    expect(txs.tx[1]).toStrictEqual(evmTxHash)
  })
})
