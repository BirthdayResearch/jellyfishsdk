import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LoanController } from '@src/module.api/loan.controller'
import { NotFoundException } from '@nestjs/common'
import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: LoanController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  const testing = Testing.create(container)
  controller = app.get(LoanController)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(6.5),
    id: 'default'
  })
  await container.generate(1)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 150,
    interestRate: new BigNumber(5.5),
    id: 'scheme1'
  })
  await container.generate(1)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 200,
    interestRate: new BigNumber(4.5),
    id: 'scheme2'
  })
  await container.generate(1)

  await testing.rpc.loan.createLoanScheme({
    minColRatio: 250,
    interestRate: new BigNumber(3.5),
    id: 'scheme3'
  })
  await container.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('loan', () => {
  it('should listLoanSchemes', async () => {
    const result = await controller.listScheme({ size: 100 })
    expect(result.data.length).toStrictEqual(4)
    expect(result.data).toStrictEqual([
      {
        id: 'default',
        minColRatio: '100',
        interestRate: '6.5'
      },
      {
        id: 'scheme1',
        minColRatio: '150',
        interestRate: '5.5'
      },
      {
        id: 'scheme2',
        minColRatio: '200',
        interestRate: '4.5'
      },
      {
        id: 'scheme3',
        minColRatio: '250',
        interestRate: '3.5'
      }
    ])
  })

  it('should listSchemes with pagination', async () => {
    const first = await controller.listScheme({ size: 2 })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('scheme1')

    expect(first.data[0].id).toStrictEqual('default')
    expect(first.data[1].id).toStrictEqual('scheme1')

    const next = await controller.listScheme({
      size: 2,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toStrictEqual('scheme3')

    expect(next.data[0].id).toStrictEqual('scheme2')
    expect(next.data[1].id).toStrictEqual('scheme3')

    const last = await controller.listScheme({
      size: 2,
      next: next.page?.next
    })

    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should listSchemes with an empty object if size 100 next 300 which is out of range', async () => {
    const result = await controller.listScheme({ size: 100, next: '300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})

describe('get', () => {
  it('should get scheme by symbol', async () => {
    const data = await controller.getScheme('default')
    expect(data).toStrictEqual(
      {
        id: 'default',
        minColRatio: '100',
        interestRate: '6.5'
      }
    )
  })

  it('should throw error while getting non-existent scheme', async () => {
    expect.assertions(2)
    try {
      await controller.getScheme('999')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find scheme',
        error: 'Not Found'
      })
    }
  })
})
