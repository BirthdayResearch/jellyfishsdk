// import { RootModule } from './modules/RootModule'
// import { NestFastifyApplication } from '@nestjs/platform-fastify'
// import { NestFactory } from '@nestjs/core'
// import { RootServer } from '@defichain-apps/libs/rootserver'
// import { newFastifyAdapter } from '../../../playground-api/src/Fastify'
// import { ConfigService } from '@nestjs/config'
//
// export abstract class ApiServer extends RootServer {
//
//   async create (): Promise<NestFastifyApplication> {
//     return await NestFactory.create<NestFastifyApplication>(RootModule, this.adapter)
//   }
//
//   // For Playground API Server
//   // Put this in PlaygroundApiServer?
//   adapter = newFastifyAdapter()
//   async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
//     await app.listen(process.env.PORT ?? '3000', '0.0.0.0')
//   }
// }
//
// /**
//  * Bootstrap RootModule and start server
//  */
// if (require.main === module) {
//   void new ApiServer().start()
// }
