
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TransferDomainType } from '../../../src/category/account'
import BigNumber from 'bignumber.js'

describe('EVMTX', () => {
  let dfiAddress: string, ethAddress: string, toEthAddress: string
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const testing = Testing.create(container)
  const amount = {
    ONE: 1,
    HUNDRED: 100
  }
  const txGas = {
    gasPrice: 21,
    gasLimit: 21000
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await client.masternode.setGov({
      ATTRIBUTES: {
        // Enable evm
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
    dfiAddress = await container.call('getnewaddress', ['', 'legacy'])
    await container.call('utxostoaccount', [{ [dfiAddress]: '105@DFI' }])
    await container.generate(1)
    ethAddress = await container.call('getnewaddress', ['', 'erc55'])
    toEthAddress = await container.call('getnewaddress', ['', 'erc55'])
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should verify that feature/evm gov attribute is set', async () => {
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES['v0/params/feature/evm']).toStrictEqual('true')
  })

  it('should successfully create a new EVM transaction', async () => {
    const balanceDFIAddressBefore: Record<string, BigNumber> = await client.call('getaccount', [dfiAddress, {}, true], 'bignumber')
    const dvmToEvmTransfer = [
      {
        src: {
          address: dfiAddress,
          amount: `${amount.HUNDRED}@DFI`,
          domain: TransferDomainType.DVM
        },
        dst: {
          address: ethAddress,
          amount: `${amount.HUNDRED}@DFI`,
          domain: TransferDomainType.EVM
        }
      }
    ]
    await container.call('transferdomain', [dvmToEvmTransfer])
    await container.generate(1)

    const balanceDFIAddressAfter: Record<string, BigNumber> = await client.call('getaccount', [dfiAddress, {}, true], 'bignumber')
    expect(balanceDFIAddressAfter['0']).toStrictEqual(balanceDFIAddressBefore['0'].minus(amount.HUNDRED))

    const evmTxHash = await client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(amount.ONE),
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
      value: new BigNumber(amount.ONE),
      data: 'ad33eb89000000000000000000000000a218a0ea9a888e3f6e2dffdf4066885f596f07bf', // random methodId 0xad33eb89, random tokenAddr 000000000000000000000000a218a0ea9a888e3f6e2dffdf4066885f596f07bf
      nonce: 1,
      ...txGas
    })
    await container.generate(1)

    const blockHash: string = await client.blockchain.getBestBlockHash()
    const txs = await client.blockchain.getBlock(blockHash, 1)
    expect(txs.tx[1]).toStrictEqual(evmTxHash)
  })

  it('should fail creation of evmtx when data input is not hex', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(amount.ONE),
      nonce: 2,
      data: '1234abcnothex',
      ...txGas
    })).rejects.toThrow(new RpcApiError({ code: -8, method: 'evmtx', message: 'Input param expected to be in hex format' }))
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
      value: new BigNumber(amount.ONE),
      nonce: 2,
      ...txGas
    })).rejects.toThrow(new RpcApiError({ code: -8, method: 'evmtx', message: 'from address not an Ethereum address' }))
  })

  it('should fail creation of evmtx when to address is not a valid ethereum address', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: dfiAddress,
      value: new BigNumber(amount.ONE),
      nonce: 2,
      ...txGas
    })).rejects.toThrow(new RpcApiError({ code: -8, method: 'evmtx', message: 'to address not an Ethereum address' }))
  })

  it('should fail creation of evmtx when nonce is not valid (already used)', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(amount.ONE),
      nonce: 0,
      ...txGas
    })).rejects.toThrow(RpcApiError)
  })

  it('should fail creation of evmtx when gas price is not valid', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(amount.ONE),
      nonce: 2,
      gasPrice: Number.MAX_VALUE,
      gasLimit: txGas.gasLimit
    })).rejects.toThrow(new RpcApiError({ code: -1, method: 'evmtx', message: 'JSON integer out of range' }))
  })

  it('should fail creation of evmtx when gas limit is not valid', async () => {
    await expect(client.evm.evmtx({
      from: ethAddress,
      to: toEthAddress,
      value: new BigNumber(amount.ONE),
      nonce: 2,
      gasPrice: txGas.gasPrice,
      gasLimit: Number.MAX_VALUE
    })).rejects.toThrow(new RpcApiError({ code: -1, method: 'evmtx', message: 'JSON integer out of range' }))
  })
})
