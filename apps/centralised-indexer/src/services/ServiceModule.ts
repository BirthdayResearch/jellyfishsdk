import { Module } from '@nestjs/common'
import { DexSwapController } from './dex-swap/DexSwapController'
import { ModelModule } from '../models/ModelModule'

@Module({
  imports: [
    ModelModule.register({
      readOnly: true
    })
  ],
  controllers: [
    DexSwapController
  ]
})
export class ServiceModule {
}
