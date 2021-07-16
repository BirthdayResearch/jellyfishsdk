import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '@src/e2e.module'
import { NotFoundException } from '@nestjs/common'
import { MasternodesController } from '@src/module.api/masternode.controller'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: MasternodesController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()

  app = await createTestingApp(container)
  controller = app.get(MasternodesController)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('list', () => {
  it('should list masternodes', async () => {
    const result = await controller.list({ size: 4 })
    expect(result.data.length).toStrictEqual(4)
    expect(Object.keys(result.data[0]).length).toStrictEqual(7)
  })

  it('should list masternodes with pagination', async () => {
    const first = await controller.list({ size: 4 })
    expect(first.data.length).toStrictEqual(4)

    const next = await controller.list({
      size: 4,
      next: first.page?.next
    })
    expect(next.data.length).toStrictEqual(4)
    expect(next.page?.next).toStrictEqual(next.data[3].id)

    const last = await controller.list({
      size: 4,
      next: next.page?.next
    })
    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toStrictEqual(undefined)
  })
})

describe('get', () => {
  it('should get a masternode with id', async () => {
    // get a masternode from list
    const masternode = (await controller.list({ size: 1 })).data[0]

    const result = await controller.get(masternode.id)
    expect(Object.keys(result).length).toStrictEqual(7)
    expect(result).toStrictEqual(masternode)
  })

  it('should fail due to non-existent masternode', async () => {
    expect.assertions(2)
    try {
      await controller.get('8d4d987dee688e400a0cdc899386f243250d3656d802231755ab4d28178c9816')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find masternode',
        error: 'Not Found'
      })
    }
  })
})
