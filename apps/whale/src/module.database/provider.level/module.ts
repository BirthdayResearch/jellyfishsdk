import fs from 'fs'
import { Global, Module } from '@nestjs/common'
import { LevelDatabase } from '../../module.database/provider.level/level.database'
import { ConfigService } from '@nestjs/config'
import { Database } from '../../module.database/database'

/**
 * LevelUp will fail to create if directory does not exist.
 */
function mkdir (location: string): void {
  if (fs.existsSync(location)) {
    return
  }
  fs.mkdirSync(location, { recursive: true })
}

@Global()
@Module({
  providers: [
    {
      provide: 'LEVEL_UP_LOCATION',
      /**
       * if isProd, resolve to .leveldb/{network}
       * else, resolve to .leveldb/{network}/time-now
       */
      useFactory: (configService: ConfigService): string => {
        const isProd = configService.get<boolean>('isProd', false)
        const network = configService.get<string>('network', 'unknown')
        const defaultLocation = isProd ? `.leveldb/${network}` : `.leveldb/${network}/${Date.now()}`

        const location = configService.get<string>('database.level.location', defaultLocation)
        mkdir(location)
        return location
      },
      inject: [ConfigService]
    },
    {
      provide: Database,
      useClass: LevelDatabase
    }
  ],
  exports: [
    Database
  ]
})
export class LevelDatabaseModule {
}
