import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Loan', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vId = ''
  let collateralAddr = ''

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()

    const { vaultId, collateralAddress } = await setup()
    vId = vaultId
    collateralAddr = collateralAddress
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<any> {
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
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const vaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    return { vaultId, collateralAddress }
  }

  it('should be failed as first deposit must be DFI', async () => {
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      id: vId, from: collateralAddr, amount: '1@BTC'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('First deposit must be in DFI')
  })

  it('should be failed as insufficient fund', async () => {
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      id: vId, from: collateralAddr, amount: '99999@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Insufficient funds: can't subtract balance of ${collateralAddr}: amount 20000.00000000 is less than 99999.00000000`)
  })

  it('should be failed as different auth address', async () => {
    const addr = await tGroup.get(1).generateAddress()
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      id: vId, from: addr, amount: '1@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Incorrect authorization for ${addr}`)
  })

  it('should be failed as vault is not exists', async () => {
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      id: '0'.repeat(64), from: collateralAddr, amount: '10000@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`vault <${'0'.repeat(64)}> not found`)
  })

  it('should depositToVault', async () => {
    {
      const vaultBefore = await tGroup.get(0).container.call('getvault', [vId])
      const vaultBeforeDFIAcc = vaultBefore.collateralAmounts.length > 0
        ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
        : undefined
      const vaultBeforeDFIAmt = vaultBeforeDFIAcc !== undefined ? Number(vaultBeforeDFIAcc.split('@')[0]) : 0

      const depositId = await tGroup.get(0).rpc.loan.depositToVault({
        id: vId, from: collateralAddr, amount: '10000@DFI'
      })
      expect(typeof depositId).toStrictEqual('string')
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      const vaultAfter = await tGroup.get(0).container.call('getvault', [vId])
      const vaultAfterDFIAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
      const vaultAFterDFIAmt = Number(vaultAfterDFIAcc.split('@')[0])
      expect(vaultAFterDFIAmt - vaultBeforeDFIAmt).toStrictEqual(10000)
    }

    {
      const vaultBefore = await tGroup.get(0).container.call('getvault', [vId])
      const vaultBeforeBTCAcc = vaultBefore.collateralAmounts.length > 0
        ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'BTC')
        : undefined
      const vaultBeforeBTCAmt = vaultBeforeBTCAcc !== undefined ? Number(vaultBeforeBTCAcc.split('@')[0]) : 0

      const depositId = await tGroup.get(0).rpc.loan.depositToVault({
        id: vId, from: collateralAddr, amount: '1@BTC'
      })
      expect(typeof depositId).toStrictEqual('string')
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      const vaultAfter = await tGroup.get(0).container.call('getvault', [vId])
      const vaultAfterBTCAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'BTC')
      const vaultAFterBTCAmt = Number(vaultAfterBTCAcc.split('@')[0])
      expect(vaultAFterBTCAmt - vaultBeforeBTCAmt).toStrictEqual(1)
    }
  })

  it('should depositToVault with utxos', async () => {
    const vaultBefore = await tGroup.get(0).container.call('getvault', [vId])
    const vaultBeforeDFIAcc = vaultBefore.collateralAmounts.length > 0
      ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
      : undefined
    const vaultBeforeDFIAmt = vaultBeforeDFIAcc !== undefined ? Number(vaultBeforeDFIAcc.split('@')[0]) : 0

    const utxo = await tGroup.get(0).container.fundAddress(collateralAddr, 250)
    const depositId = await tGroup.get(0).rpc.loan.depositToVault({
      id: vId, from: collateralAddr, amount: '250@DFI'
    }, [utxo])
    expect(typeof depositId).toStrictEqual('string')
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const vaultAfter = await tGroup.get(0).container.call('getvault', [vId])
    const vaultAfterDFIAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
    const vaultAFterDFIAmt = Number(vaultAfterDFIAcc.split('@')[0])
    expect(vaultAFterDFIAmt - vaultBeforeDFIAmt).toStrictEqual(250)

    const rawtx = await tGroup.get(0).container.call('getrawtransaction', [depositId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should be failed as vault must contain min 50% of DFI', async () => {
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      id: vId, from: collateralAddr, amount: '100@BTC'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('At least 50% of the vault must be in DFI')
  })
})
