import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RootConfiguration } from './RootConfiguration'
import { ControllerModule } from './ControllerModule'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [RootConfiguration]
    }),
    ControllerModule
  ]
})
export class RootModule {
}
