export interface PersistentStorage<K, V> {
  put: (key: K, data: V) => Promise<void>
  delete: (key: K) => Promise<void>
  get: (key: K) => Promise<V | undefined>
}

/**
 * For unit test use.
 */
export abstract class StubbedStorageService<K, V> implements PersistentStorage<K, V> {
  private readonly DATA: { [key: string]: V } = {}

  abstract serializeKey (k: K): string

  async get (key: K): Promise<V | undefined> {
    return this.DATA[this.serializeKey(key)]
  }

  async put (key: K, value: V): Promise<void> {
    this.DATA[this.serializeKey(key)] = value
  }

  async delete (key: K): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.DATA[this.serializeKey(key)]
  }
}
