export interface Schema<T> {
  id: string
  partition: string
  sort: number
  data: T
}

export interface FindOptions {
  partition: string
  order: 'ASC' | 'DESC'
  limit: number
  gt?: number
  lt?: number
}

export interface SingleIndexDb<T> {
  put: (data: Schema<T>) => Promise<void>
  delete: (id: string) => Promise<void>
  get: (id: string) => Promise<Schema<T> | undefined>
  list: (filter: FindOptions) => Promise<Array<Schema<T>>>
}

/**
 * For unit test use.
 */
export class InMemoryDatabase<T> implements SingleIndexDb<T> {
  private data: Record<string, Array<Schema<T>>> = {}

  async put (data: Schema<T>): Promise<void> {
    if (this.data[data.partition] === undefined) {
      this.data[data.partition] = []
    }

    this.data[data.partition].push(data)
    this.data[data.partition] = this.data[data.partition].sort((a, b) => a.sort - b.sort)
  }

  async delete (id: string): Promise<void> {
    for (const partition of Object.values(this.data)) {
      const index = partition.findIndex(d => d.id === id)
      partition.splice(index, 1)
    }
  }

  async get (id: string): Promise<Schema<T> | undefined> {
    for (const partition of Object.values(this.data)) {
      const found = partition.find(d => d.id === id)
      if (found !== undefined) {
        return found
      }
    }
  }

  async list (options: FindOptions): Promise<Array<Schema<T>>> {
    const partition = this.data[options.partition]
    if (partition === undefined) {
      return []
    }

    let result = options.order === 'ASC' ? partition : partition.reverse()

    if (options.gt !== undefined) {
      result = result.filter(d => d.sort > (options.gt as number))
    }

    if (options.lt !== undefined) {
      result = result.filter(d => d.sort < (options.lt as number))
    }

    return result.slice(0, options.limit)
  }
}
