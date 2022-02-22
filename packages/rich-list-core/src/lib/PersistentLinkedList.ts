export interface PersistentLinkedList<T> {
  append: (data: T) => Promise<void>
  removeLast: () => Promise<void>
  getLast: () => Promise<T | undefined>
  size: () => Promise<number>
}
