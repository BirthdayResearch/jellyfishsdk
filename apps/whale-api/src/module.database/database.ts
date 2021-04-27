export abstract class Database {
  // TODO(fuxingloh): remove temporary implementation

  abstract get (key: string): any

  abstract put (key: string, data: any): void
}
