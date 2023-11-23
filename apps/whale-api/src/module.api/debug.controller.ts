import { Controller, ForbiddenException, Get, Inject } from '@nestjs/common'
import { NetworkName } from '@defichain/jellyfish-network'
import { Database } from '../module.database/database'

@Controller('/debug')
export class DebugController {
  constructor (
    protected readonly database: Database,
    @Inject('NETWORK') protected readonly network: NetworkName
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
