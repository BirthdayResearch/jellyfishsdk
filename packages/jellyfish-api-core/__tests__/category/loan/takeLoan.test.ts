import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Loan', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId: string
  let vaultAddress: string

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    const collateralAddress = await tGroup.get(0).container.getNewAddress()
    await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 20000 })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
    await tGroup.get(0).token.create({ symbol: 'BTC', collateralAddress })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
    await tGroup.get(0).token.mint({ symbol: 'BTC', amount: 20000 })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // oracle setup
    const addr = await tGroup.get(0).generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    const oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // collateral token
    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      priceFeedId: oracleId
      // activateAfterBlock: 130  // <- hit socket hang up
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      priceFeedId: oracleId
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // loan token
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'TSLA',
      priceFeedId: oracleId
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // loan scheme set up
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    vaultAddress = await tGroup.get(0).generateAddress()
    vaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    await tGroup.get(0).rpc.loan.depositToVault({
      id: vaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    await tGroup.get(0).rpc.loan.depositToVault({
      id: vaultId, from: collateralAddress, amount: '1@BTC'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  }

  it('should not takeLoan on nonexistent vault', async () => {
    const promise = tGroup.get(0).rpc.loan.takeLoan({
      vaultId: '0'.repeat(64),
      amounts: '30@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Cannot find existing vault with id ${'0'.repeat(64)}`)
  })

  it('should not takeLoan on nonexistent loan token', async () => {
    const promise = tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '1@BTC'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
  })

  it('should not takeLoan on invalid token', async () => {
    const promise = tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '1@INVALID'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: INVALID')
  })

  it('should not takeLoan on incorrect auth', async () => {
    const promise = tGroup.get(1).rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '30@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Incorrect authorization for ${vaultAddress}`)
  })

  it('should not takeLoan while exceed vault collateralization ratio', async () => {
    const promise = tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '300000@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Vault does not have enough collateralization ratio defined by loan scheme')
  })

  it('should not takeLoan on mintable:false token', async () => {
    await tGroup.get(0).container.call('updateloantoken', ['TSLA', { mintable: false }])
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const promise = tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '30@TSLA'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Loan cannot be taken on token with id (2) as "mintable" is currently false')

    await tGroup.get(0).container.call('updateloantoken', ['TSLA', { mintable: true }])
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  })

  it('should takeLoan', async () => {
    const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
    const vaultBeforeTSLAAcc = vaultBefore.loanAmount.length > 0
      ? vaultBefore.loanAmount.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const vaultBeforeTSLAAmt = vaultBeforeTSLAAcc !== undefined ? Number(vaultBeforeTSLAAcc.split('@')[0]) : 0

    const txid = await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '30@TSLA'
    })
    expect(typeof txid).toStrictEqual('string')
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
    const vaultAfterTSLAAcc = vaultAfter.loanAmount.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const vaultAfterTSLAAmt = Number(vaultAfterTSLAAcc.split('@')[0])
    expect(vaultAfterTSLAAmt - vaultBeforeTSLAAmt).toStrictEqual(30)
  })

  it('should takeLoan with utxos', async () => {
    const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
    const vaultBeforeTSLAAcc = vaultBefore.loanAmount.length > 0
      ? vaultBefore.loanAmount.find((amt: string) => amt.split('@')[1] === 'TSLA')
      : undefined
    const vaultBeforeTSLAAmt = vaultBeforeTSLAAcc !== undefined ? Number(vaultBeforeTSLAAcc.split('@')[0]) : 0

    const utxo = await tGroup.get(0).container.fundAddress(vaultAddress, 250)
    const txid = await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '5@TSLA'
    }, [utxo])
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
    const vaultAfterTSLAAcc = vaultAfter.loanAmount.find((amt: string) => amt.split('@')[1] === 'TSLA')
    const vaultAfterTSLAAmt = Number(vaultAfterTSLAAcc.split('@')[0])
    expect(vaultAfterTSLAAmt - vaultBeforeTSLAAmt).toStrictEqual(5)

    const rawtx = await tGroup.get(0).container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })
})
