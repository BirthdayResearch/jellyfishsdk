import packageJson from '../../package.json'
import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { AppConfiguration } from './app.configuration'

import { ApiModule } from './module.api/_module'
import { DatabaseModule } from './module.database/_module'
import { DeFiDModule } from './module.defid/_module'
import { HealthModule } from './module.health/_module'
import { IndexerModule } from './module.indexer/_module'
import { ModelModule } from './module.model/_module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import { newFastifyAdapter } from './fastify'
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter'

@Module({})
export class AppModule {
  static async create (provider?: string, adapter: AbstractHttpAdapter = newFastifyAdapter()): Promise<NestFastifyApplication> {
    const app = await NestFactory.create<NestFastifyApplication>(
      this.forRoot(provider),
      adapter
    )

    this.configure(app)
    return app
  }

  static forRoot (provider?: string): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [AppConfiguration]
        }),
        ScheduleModule.forRoot(),
        ApiModule,
        DatabaseModule.forRoot(provider),
        DeFiDModule,
        HealthModule,
        IndexerModule,
        ModelModule
      ]
    }
  }

  /**
   * Configure NestFastifyApplication with
   * - CORS
   * - GlobalPrefix 'v{major}.{minor}/${network}' e.g. 'v0.0/regtest'
   */
  static configure (app: NestFastifyApplication): void {
    const version = this.getVersion(app)
    const network = app.get(ConfigService).get<string>('network') as string

    app.enableCors({
      origin: '*',
      methods: ['GET', 'PUT', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type'],
      maxAge: 60 * 24 * 7
    })

    app.setGlobalPrefix(`${version}/${network}`, {
      exclude: [
        '/_actuator/probes/liveness',
        '/_actuator/probes/readiness'
      ]
    })
  }

  /**
   * @return string version from ConfigService, default to package.json v{major}.{minor} if not found.
   */
  static getVersion (app: NestFastifyApplication): string {
    const [major, minor] = packageJson.version.split('.')
    const defaultVersion = `v${major}.${minor}`
    return app.get(ConfigService).get<string>('version', defaultVersion)
  }
}
