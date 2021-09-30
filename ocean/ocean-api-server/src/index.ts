import { RootModule } from './RootModule'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import packageJson from '../package.json'
import { ConfigService } from '@nestjs/config'

/**
 * Get version from Config, fallback to package.json
 */
function getVersion (app: NestFastifyApplication): string {
  const [major, minor] = packageJson.version.split('.')
  const defaultVersion = `v${major}.${minor}`
  return app.get(ConfigService).get<string>('version', defaultVersion)
}

/**
 * Get network from Config
 */
function getNetwork (app: NestFastifyApplication): string {
  return app.get(ConfigService).get<string>('network') as string
}

/**
 * Bootstrap RootModule and start on port 3000
 */
async function bootstrap (): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(RootModule)

  const version = getVersion(app)
  const network = getNetwork(app)

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
  await app.listen(process.env.PORT ?? '3000', '0.0.0.0')
}

/* eslint-disable no-void */
void bootstrap()
