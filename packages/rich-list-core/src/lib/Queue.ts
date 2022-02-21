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
export class StubbedQueueService<T> implements Queue<T> {
  private DATA: T[] = []

  async push (message: T): Promise<string> {
    this.DATA.push(message)
    return `${this.DATA.length - 1}`
  }

  async receive (maxMessage: number): Promise<T[]> {
    const startIndex = Math.min(this.DATA.length - maxMessage, 0)
    const consumed = this.DATA.slice(startIndex)
    this.DATA = this.DATA.slice(0, startIndex)
    return consumed
  }
}

/**
 * For unit test use.
 */
export class StubbedQueueClient<T> implements QueueClient<T> {
  private readonly DATA: { [key: string]: Queue<T> } = {}

  getQueue (name: string): Queue<T> | undefined {
    return this.DATA[name]
  }

  async createQueueIfNotExist (name: string, mode: Mode): Promise<Queue<T>> {
    this.DATA[name] = new StubbedQueueService()
    return this.DATA[name]
  }
}
