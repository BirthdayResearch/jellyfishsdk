import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ControllerModule } from './ControllerModule'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true
    }),
    ControllerModule
  ]
})

export class RootModule {
}
