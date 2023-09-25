import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { AddressController } from './address.controller'
import { createToken, mintTokens, sendTokensToAddress } from '@defichain/testing'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'
import { createTestingApp, stopTestingApp } from '../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)
const address = 'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r'
let controller: AddressController
let app: NestFastifyApplication

const tokens = ['A', 'B', 'C', 'D', 'E', 'F']

async function setupLoanToken (): Promise<void> {
  const oracleId = await testing.rpc.oracle.appointOracle(await testing.generateAddress(), [
    { token: 'DFI', currency: 'USD' },
    { token: 'LOAN', currency: 'USD' }
  ], { weightage: 1 })
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [
      { tokenAmount: '2@DFI', currency: 'USD' },
      { tokenAmount: '2@LOAN', currency: 'USD' }
    ]
  })
  await testing.generate(1)

  await testing.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await testing.rpc.loan.setLoanToken({
    symbol: 'LOAN',
    name: 'LOAN',
    fixedIntervalPriceId: 'LOAN/USD',
    mintable: true,
    interest: new BigNumber(0.02)
  })
  await testing.generate(1)

  await testing.token.dfi({
    address: await testing.address('DFI'),
    amount: 100
  })

  await testing.rpc.loan.createLoanScheme({
    id: 'scheme',
    minColRatio: 110,
    interestRate: new BigNumber(1)
  })
  await testing.generate(1)

  const vaultId = await testing.rpc.loan.createVault({
    ownerAddress: await testing.address('VAULT'),
    loanSchemeId: 'scheme'
  })
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
    prices: [
      { tokenAmount: '2@DFI', currency: 'USD' },
      { tokenAmount: '2@LOAN', currency: 'USD' }
    ]
  })
  await testing.generate(1)

  await testing.rpc.loan.depositToVault({
    vaultId: vaultId,
    from: await testing.address('DFI'),
    amount: '100@DFI'
  })
  await testing.generate(1)
  await testing.rpc.loan.takeLoan({
    vaultId: vaultId,
    amounts: '10@LOAN',
    to: address
  })
  await testing.generate(1)
}

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
  controller = app.get(AddressController)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('listTokens', () => {
  beforeAll(async () => {
    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token, { mintAmount: 1000 })
      await sendTokensToAddress(container, address, 10, token)
    }
    await container.generate(1)

    await setupLoanToken()
  })

  it('should listTokens', async () => {
    const response = await controller.listTokens(address, {
      size: 30
    })

    expect(response.data.length).toStrictEqual(7)
    expect(response.page).toBeUndefined()

    expect(response.data[5]).toStrictEqual({
      id: '6',
      amount: '10.00000000',
      symbol: 'F',
      displaySymbol: 'dF',
      symbolKey: 'F',
      name: 'F',
      isDAT: true,
      isLPS: false,
      isLoanToken: false
    })

    expect(response.data[6]).toStrictEqual({
      id: '7',
      amount: '10.00000000',
      symbol: 'LOAN',
      displaySymbol: 'dLOAN',
      symbolKey: 'LOAN',
      name: 'LOAN',
      isDAT: true,
      isLPS: false,
      isLoanToken: true
    })
  })

  it('should listTokens with pagination', async () => {
    const first = await controller.listTokens(address, {
      size: 2
    })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('2')
    expect(first.data[0].symbol).toStrictEqual('A')
    expect(first.data[1].symbol).toStrictEqual('B')

    const next = await controller.listTokens(address, {
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(5)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toStrictEqual('C')
    expect(next.data[1].symbol).toStrictEqual('D')
    expect(next.data[2].symbol).toStrictEqual('E')
    expect(next.data[3].symbol).toStrictEqual('F')
    expect(next.data[4].symbol).toStrictEqual('LOAN')
  })

  it('should listTokens with undefined next pagination', async () => {
    const first = await controller.listTokens(address, {
      size: 2,
      next: undefined
    })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('2')
  })

  it('should return empty and page undefined while listTokens with invalid address', async () => {
    const tokens = await controller.listTokens('invalid', { size: 30 })
    expect(tokens).toStrictEqual(expect.objectContaining({ data: [], page: undefined }))
  })
})
