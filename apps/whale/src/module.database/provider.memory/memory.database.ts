import { Database } from '@src/module.database/database'

export class MemoryDatabase extends Database {
  // TODO(fuxingloh): remove temporary implementation

  private readonly records: Record<string, any> = {}

  get (key: string): any {
    return this.records[key]
  }

  put (key: string, data: any): void {
    this.records[key] = data
  }
}
