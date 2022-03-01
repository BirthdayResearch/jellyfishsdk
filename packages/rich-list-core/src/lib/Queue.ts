export type Mode = 'LIFO' | 'FIFO'

export interface Queue<T> {
  push: (message: T) => Promise<string> // message id / handle
  receive: (maxMessage: number) => Promise<T[]>
}

export interface QueueClient<T> {
  createQueueIfNotExist: (name: string, mode: Mode) => Promise<Queue<T>>
}

/**
 * For unit test use.
 */
export class InMemoryQueueService implements Queue<string> {
  private DATA: string[] = []

  async push (message: string): Promise<string> {
    const toBeDedup = this.DATA.findIndex(d => d === message)
    if (toBeDedup !== -1) {
      this.DATA.splice(toBeDedup, 1)
    }
    this.DATA.push(message)
    return `${this.DATA.length - 1}`
  }

  async receive (maxMessage: number): Promise<string[]> {
    const startIndex = Math.min(this.DATA.length - maxMessage, 0)
    const consumed = this.DATA.slice(startIndex)
    this.DATA = this.DATA.slice(0, startIndex)
    return consumed
  }
}

/**
 * For unit test use.
 */
export class InMemoryQueueClient implements QueueClient<string> {
  private readonly DATA: { [key: string]: InMemoryQueueService } = {}

  getQueue (name: string): InMemoryQueueService | undefined {
    return this.DATA[name]
  }

  async createQueueIfNotExist (name: string, mode: Mode): Promise<InMemoryQueueService> {
    if (this.DATA[name] === undefined) {
      this.DATA[name] = new InMemoryQueueService()
    }
    return this.DATA[name]
  }
}
