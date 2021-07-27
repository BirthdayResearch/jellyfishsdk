import { AppModule } from '@src/app.module'

/**
 * Bootstrap AppModule and start on port 3000
 */
async function bootstrap (): Promise<void> {
  const app = await AppModule.create()
  await app.listen(process.env.PORT ?? '3000', '0.0.0.0')
}

/* eslint-disable no-void */
void bootstrap()
