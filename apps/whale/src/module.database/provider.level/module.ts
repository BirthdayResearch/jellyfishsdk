import fs from 'fs'
import { Global, Module } from '@nestjs/common'
import { LevelDatabase } from '@src/module.database/provider.level/level.database'
import { ConfigService } from '@nestjs/config'
import { Database } from '@src/module.database/database'

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
      useFactory: (configService: ConfigService): string => {
        const location = configService.get(
          'database.level.location',
          process.env.NODE_ENV === 'production ' ? '.level/index' : `.level/unnamed/${Date.now()}`
        )
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
