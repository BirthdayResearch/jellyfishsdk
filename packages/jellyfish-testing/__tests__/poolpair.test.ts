import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'

const testing = Testing.create(new MasterNodeRegTestContainer())
let loanMinterAddr: string
let loanVaultId: string

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}

async function setup (): Promise<void> {
  loanMinterAddr = await testing.generateAddress()

  const utxos = await testing.rpc.wallet.listUnspent()
  const inputs = utxos.map((utxo: { txid: string, vout: number }) => {
    return {
      txid: utxo.txid,
      vout: utxo.vout
    }
  })

  await testing.rpc.account.utxosToAccount({ [loanMinterAddr]: '10000000@DFI' }, inputs)
  await testing.generate(1)

  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'ABC', currency: 'USD' }
  ]
  const oraclePriceData = {
    prices: [
      { tokenAmount: '1@DFI', currency: 'USD' },
      { tokenAmount: '0.1@ABC', currency: 'USD' }
    ]
  }

  const oracleAddr = await testing.generateAddress()
  const oracleId = await testing.rpc.oracle.appointOracle(oracleAddr, priceFeeds, { weightage: 1 })
  await testing.generate(1)
  await testing.rpc.oracle.setOracleData(oracleId, now(), oraclePriceData)
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.rpc.loan.setLoanToken({
    symbol: 'ABC',
    fixedIntervalPriceId: 'ABC/USD'
  })
  await testing.generate(1)

  // setup loan scheme and vault
  const loanTokenSchemeId = 'minter'
  await testing.rpc.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(0.01),
    id: loanTokenSchemeId
  })
  await testing.generate(1)
  const loanTokenVaultAddr = await testing.generateAddress()
  loanVaultId = await testing.rpc.loan.createVault({
    ownerAddress: loanTokenVaultAddr,
    loanSchemeId: loanTokenSchemeId
  })

  await testing.generate(4) // extra block for oracle price to be set to live

  // deposit dfi as collateral
  await testing.rpc.loan.depositToVault({
    vaultId: loanVaultId,
    from: loanMinterAddr,
    amount: '10000000@DFI'
  })
  await testing.generate(1)
}

beforeAll(async () => {
  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()
  await setup()
})

afterAll(async () => {
  await testing.container.stop()
})

it('should create add remove swap', async () => {
  // await testing.token.create({ symbol: 'ABC' })
  await testing.token.dfi({ amount: 10 })
  await testing.generate(1)

  await testing.poolpair.create({ tokenA: 'ABC', tokenB: 'DFI' })
  await testing.rpc.loan.takeLoan({
    vaultId: loanVaultId,
    amounts: '100@ABC',
    to: loanMinterAddr
  })
  await testing.generate(1)

  await testing.poolpair.add({
    a: { amount: '5', symbol: 'DFI' },
    b: { amount: '50', symbol: 'ABC' },
    address: await testing.address('my')
  })
  await testing.generate(1)

  await testing.poolpair.remove({
    address: await testing.address('my'),
    amount: '2',
    symbol: 'ABC-DFI'
  })
  await testing.generate(1)

  await testing.poolpair.swap({
    from: await testing.address('my'),
    tokenFrom: 'ABC',
    amountFrom: 1,
    to: await testing.address('my'),
    tokenTo: 'DFI'
  })
  await testing.generate(1)

  const account = await testing.rpc.account.getAccount(await testing.address('my'))
  expect(account).toStrictEqual(expect.objectContaining([
    '0.73021717@DFI',
    '5.32455532@ABC',
    '13.81137830@ABC-DFI'
  ]))
})
