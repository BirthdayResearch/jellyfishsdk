export interface PersistentLinkedList<T> {
  append: (data: T) => Promise<void>
  removeLast: () => Promise<void>
  getLast: () => Promise<T | undefined>
  size: () => Promise<number>
}

/**
 * For unit test use.
 */
export class InMemoryLinkedListService<T> implements PersistentLinkedList<T> {
  private readonly DATA: T[] = []

  async append (data: T): Promise<void> {
    this.DATA.push(data)
  }

  async removeLast (): Promise<void> {
    this.DATA.pop()
  }

  async getLast (): Promise<T | undefined> {
    return this.DATA[this.DATA.length - 1]
  }

  async size (): Promise<number> {
    return this.DATA.length
  }
}
