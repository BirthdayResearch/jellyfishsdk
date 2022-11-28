import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import BigNumber from 'bignumber.js'

describe('Get Custom TX', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if transaction is not in block', async () => {
    const promise = client.token.getCustomTx('751e8020ed618d6a7d5ffeb1a4df6f0e4ccd344cdd72c5ab400bef63ad99df1a', await container.getBestBlockHash())

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'No such transaction found in the provided block.',
        method: 'getcustomtx'
      }
    })
  })

  it('should throw error if transaction is not in mempool', async () => {
    const promise = client.token.getCustomTx('751e8020ed618d6a7d5ffeb1a4df6f0e4ccd344cdd72c5ab400bef63ad99df1a')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'No such mempool, wallet or blockchain transaction.',
        method: 'getcustomtx'
      }
    })
  })

  it('should throw error if incorrect blockhash', async () => {
    const promise = client.token.getCustomTx('751e8020ed618d6a7d5ffeb1a4df6f0e4ccd344cdd72c5ab400bef63ad99df1a', '751e8020ed618d6a7d5ffeb1a4df6f0e4ccd344cdd72c5ab400bef63ad99df1a')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Block hash not found',
        method: 'getcustomtx'
      }
    })
  })

  it('should return custom transaction details - createToken', async () => {
    const txid = await client.token.createToken({
      symbol: 'TEST',
      name: 'TEST',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: await container.getNewAddress()
    })
    await container.generate(1)

    const result = await client.token.getCustomTx(txid, await container.getBestBlockHash())

    expect(result).toMatchObject({
      type: 'CreateToken',
      valid: true,
      results: {
        creationTx: txid,
        name: 'TEST',
        symbol: 'TEST',
        isDAT: true,
        mintable: true,
        tradeable: true,
        finalized: false
      },
      blockHeight: await client.blockchain.getBlockCount(),
      blockhash: await client.blockchain.getBestBlockHash(),
      confirmations: 1
    })
  })

  it('should return custom transaction details - createLoanScheme', async () => {
    const txid = await client.loan.createLoanScheme({
      minColRatio: 105,
      interestRate: new BigNumber(5),
      id: 'LOAN105'
    })
    await container.generate(1)

    const result = await client.token.getCustomTx(txid, await container.getBestBlockHash())

    expect(result).toMatchObject({
      type: 'LoanScheme',
      valid: true,
      results: {
        id: 'LOAN105',
        interestrate: 5,
        mincolratio: 105,
        updateHeight: 0
      },
      blockHeight: await client.blockchain.getBlockCount(),
      blockhash: await client.blockchain.getBestBlockHash(),
      confirmations: 1
    })
  })
})
