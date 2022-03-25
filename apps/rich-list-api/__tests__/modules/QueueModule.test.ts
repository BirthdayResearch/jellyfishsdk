import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { QueueItem, QueueModule, QueueService } from '../../src/modules/QueueModule'

let app!: TestingModule
let queueService: QueueService
let postgres!: StartedTestContainer

describe('Queue Module', () => {
  beforeAll(async () => {
    postgres = await new GenericContainer('postgres')
      .withEnv('POSTGRES_USER', 'test')
      .withEnv('POSTGRES_PASSWORD', 'test')
      .withEnv('POSTGRES_DB', 'queuemodule')
      .withExposedPorts(5432)
      .withTmpFs({ '/temp_pgdata': 'rw,noexec,nosuid,size=65536k' })
      .start()

    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: postgres.getMappedPort(5432),
          username: 'test',
          password: 'test',
          database: 'queuemodule',
          entities: [QueueItem],
          synchronize: true
        }),
        QueueModule
      ]
    }).compile()

    queueService = app.get<QueueService>(QueueService)
  })

  afterAll(async () => {
    await app.close()
    await postgres.stop()
  })

  describe('LIFO', () => {
    it('READ should consume newest message and remove them from queue', async () => {
      const queue = await queueService.createQueueIfNotExist('testing_queue_service_lifo', 'LIFO')
      await queue.push('one')
      await queue.push('two')
      await queue.push('three')

      const readTwo = await queue.receive(2)
      expect(readTwo.length).toStrictEqual(2)
      expect(readTwo[0]).toStrictEqual('three')
      expect(readTwo[1]).toStrictEqual('two')

      const readLast = await queue.receive(2)
      expect(readLast.length).toStrictEqual(1)
      expect(readLast[0]).toStrictEqual('one')
    })

    it('dedupe - old message should overwrite new message with updated timestamp', async () => {
      const queue = await queueService.createQueueIfNotExist('testing_queue_service_fifo', 'LIFO')
      await queue.push('one')
      await queue.push('two')
      await queue.push('three')
      await queue.push('two')

      const readTwo = await queue.receive(2)
      expect(readTwo.length).toStrictEqual(2)
      expect(readTwo[0]).toStrictEqual('two')
      expect(readTwo[1]).toStrictEqual('three')

      const readLast = await queue.receive(2)
      expect(readLast.length).toStrictEqual(1)
      expect(readLast[0]).toStrictEqual('one')
    })
  })

  describe('FIFO', () => {
    it('READ should consume oldest message and remove them from queue', async () => {
      const queue = await queueService.createQueueIfNotExist('testing_queue_service_fifo', 'FIFO')
      await queue.push('one')
      await queue.push('two')
      await queue.push('three')

      const readTwo = await queue.receive(2)
      expect(readTwo.length).toStrictEqual(2)
      expect(readTwo[0]).toStrictEqual('one')
      expect(readTwo[1]).toStrictEqual('two')

      const readLast = await queue.receive(2)
      expect(readLast.length).toStrictEqual(1)
      expect(readLast[0]).toStrictEqual('three')
    })

    it('dedupe - new message should overwrite old message with updated timestamp', async () => {
      const queue = await queueService.createQueueIfNotExist('testing_queue_service_fifo', 'FIFO')
      await queue.push('one')
      await queue.push('two')
      await queue.push('three')
      await queue.push('two')

      const readTwo = await queue.receive(2)
      expect(readTwo.length).toStrictEqual(2)
      expect(readTwo[0]).toStrictEqual('one')
      expect(readTwo[1]).toStrictEqual('three')

      const readLast = await queue.receive(2)
      expect(readLast.length).toStrictEqual(1)
      expect(readLast[0]).toStrictEqual('two')
    })
  })

  describe('Queue service should support multiple queues', () => {
    it('Each queue should be independent of each other', async () => {
      const queueABC = await queueService.createQueueIfNotExist('ABC', 'FIFO')
      await queueABC.push('one')
      await queueABC.push('two')
      await queueABC.push('three')

      const queueXYZ = await queueService.createQueueIfNotExist('XYZ', 'FIFO')
      await queueXYZ.push('one')
      await queueXYZ.push('two')
      await queueXYZ.push('three')

      const readABCTwo = await queueABC.receive(2)
      expect(readABCTwo.length).toStrictEqual(2)
      expect(readABCTwo[0]).toStrictEqual('one')
      expect(readABCTwo[1]).toStrictEqual('two')

      const readXYZThree = await queueXYZ.receive(3)
      expect(readXYZThree.length).toStrictEqual(3)
      expect(readXYZThree[0]).toStrictEqual('one')
      expect(readXYZThree[1]).toStrictEqual('two')
      expect(readXYZThree[2]).toStrictEqual('three')
    })
  })
})
