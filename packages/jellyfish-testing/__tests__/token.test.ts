import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { BigNumber } from '@defichain/jellyfish-api-core'

const testing = Testing.create(new MasterNodeRegTestContainer())
let loanTokenProviderAddr: string
let loanVaultId: string

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}

async function setup (): Promise<void> {
  loanTokenProviderAddr = await testing.generateAddress()
  await testing.token.dfi({ address: loanTokenProviderAddr, amount: '10000000' })
  await testing.generate(1)

  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'MINT', currency: 'USD' }
  ]
  const oraclePriceData = {
    prices: [
      { tokenAmount: '1@DFI', currency: 'USD' },
      { tokenAmount: '0.1@MINT', currency: 'USD' }
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
    symbol: 'MINT',
    fixedIntervalPriceId: 'MINT/USD'
  })
  await testing.generate(1)

  // setup loan scheme and vault
  const loanTokenSchemeId = 'borrow'
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
    from: loanTokenProviderAddr,
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

it('should create mint send', async () => {
  await testing.generate(1)
  await testing.rpc.loan.takeLoan({
    vaultId: loanVaultId,
    amounts: '100@MINT',
    to: loanTokenProviderAddr
  })
  await testing.generate(1)

  await testing.token.send({
    address: await testing.address('key-1'),
    amount: 10,
    symbol: 'MINT'
  })
  await testing.generate(1)

  const account = await testing.rpc.account.getAccount(await testing.address('key-1'))
  expect(account).toStrictEqual(['10.00000000@MINT'])
})
