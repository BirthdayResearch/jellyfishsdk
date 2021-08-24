import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { UTXO } from '@defichain/jellyfish-api-core/category/loan'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  let oracleId: string

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    oracleId = await container.call('appointoracle', [await container.getNewAddress(), [{ token: 'AAPL', currency: 'EUR' }], 1])
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should setLoanToken', async () => {
    const txId = await client.loan.setLoanToken(
      'ABC',
      'ABCTOKEN',
      {
        priceFeedId: oracleId
      }
    )

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)

    await container.generate(1)
  })

  it('should setLoanToken if symbol is more than 8 letters', async () => {
    const txId = await client.loan.setLoanToken(
      'ABCDEFGHI',
      'ABCTOKEN',
      {
        priceFeedId: oracleId
      }
    )

    await container.generate(1)

    const data = await container.call('listloantokens', [])
    expect(data[txId].token[1].symbol).toStrictEqual('ABCDEFGH')
    expect(data[txId].token[1].symbolKey).toStrictEqual('ABCDEFGH')
  })

  it('should setLoanToken if name is more than 128 letters', async () => {
    const txId = await client.loan.setLoanToken(
      'ABC',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXY', // NOTE(jingyi2811): 129 letters.
      {
        priceFeedId: oracleId
      }
    )

    await container.generate(1)

    const data = await container.call('listloantokens', [])
    expect(data[txId].token[1].name).toStrictEqual('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWX') // NOTE(jingyi2811): Only take first 128 letters.
  })

  it('should not setLoanToken if priceFeedId is invalid', async () => {
    const promise = client.loan.setLoanToken(
      'ABC',
      'ABCTOKEN',
      {
        priceFeedId: 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'
      }
    )
    await expect(promise).rejects.toThrow('Test LoanSetLoanTokenTx execution failed:\noracle (e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b) does not exist or not valid oracle!\', code: -32600, method: setloantoken')
  })

  it('should setLoanToken if mintable is false', async () => {
    const txId = await client.loan.setLoanToken(
      'ABC',
      'ABCTOKEN',
      {
        priceFeedId: oracleId,
        mintable: false
      }
    )

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)

    await container.generate(1)
  })

  it('should not setLoanToken if interest is less than 0', async () => {
    // TODO jingyi2811
    // There is a bug in the c++ side, should not allow setLoanToken if interest rate is less than 0.
    // But now it is still allowed

    // const promise = client.loan.setLoanToken(
    //   'ABC',
    //   'ABCTOKEN',
    //   {
    //     priceFeedId: oracleId,
    //     interest: 0
    //   }
    // )
    //
    // await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setloantoken')
  })

  it('should create loan scheme with utxos', async () => {
    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const txId = await client.loan.setLoanToken(
      'ABC',
      'ABCTOKEN',
      {
        priceFeedId: oracleId,
        utxos: inputs
      }
    )

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)

    await container.generate(1)
  })

  it('should create loan scheme with arbritary utxos', async () => {
    const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)

    const promise = client.loan.setLoanToken(
      'ABC',
      'ABCTOKEN',
      {
        priceFeedId: oracleId,
        utxos: [{ txid, vout }]
      }
    )

    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: setloantoken')
  })
})
