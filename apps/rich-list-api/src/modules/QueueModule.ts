import { Module, Injectable } from '@nestjs/common'
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm'
import { Repository, PrimaryGeneratedColumn, Column, Entity, Index, Unique, In } from 'typeorm'

export type Mode = 'FIFO' | 'LIFO'

@Entity()
@Unique(['queueName', 'data']) // ensure DE-DUPE built in, speed up find and replace
@Index(['queueName', 'timestamp']) // for FIFO or LIFO purpose
export class QueueItem {
  @PrimaryGeneratedColumn()
  id!: string

  @Column()
  data!: string

  @Column()
  queueName!: string

  @Column({ type: 'bigint' })
  timestamp!: number
}

@Injectable()
export class QueueService {
  constructor (
    @InjectRepository(QueueItem)
    private readonly repo: Repository<QueueItem>
  ) {}

  async createQueueIfNotExist (name: string, mode: Mode): Promise<Queue> {
    return new Queue(name, mode, this.repo)
  }
}

export class Queue {
  constructor (
    private readonly queueName: string,
    private readonly mode: Mode,
    private readonly repo: Repository<QueueItem>
  ) {}

  async receive (maxMessage: number): Promise<string[]> {
    const consumed = await this.repo.find({
      where: {
        queueName: this.queueName
      },
      take: maxMessage,
      order: {
        timestamp: this.mode === 'FIFO' ? 'ASC' : 'DESC'
      }
    })
    await this.repo.delete({ id: In(consumed.map(i => i.id)) })
    return consumed?.map(item => item.data) ?? []
  }

  async push (message: string): Promise<string> {
    const existed = await this.repo.findOne({
      where: {
        queueName: this.queueName,
        data: message
      }
    })
    if (existed !== null) {
      await this.repo.delete(existed.id)
    }

    const saved = await this.repo.save({
      data: message,
      queueName: this.queueName,
      timestamp: Date.now()
    })
    return saved.id
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([QueueItem])
  ],
  providers: [QueueService]
})
export class QueueModule {
}
