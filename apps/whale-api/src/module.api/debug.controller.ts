import { Controller, ForbiddenException, Get } from '@nestjs/common'
import { Database } from '../module.database/database'

@Controller('/debug')
export class DebugController {
  constructor (
    protected readonly database: Database
  ) {
  }

  @Get('/dumpdb')
  async dumpDb (): Promise<void> {
    if (process.env.WHALE_DEBUG === undefined) {
      throw new ForbiddenException('Debug mode is not enabled')
    }
    await this.database.dump()
  }
}
