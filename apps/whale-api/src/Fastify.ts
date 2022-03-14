import { JellyfishJSON } from '@defichain/jellyfish-json'
import { FastifyAdapter } from '@nestjs/platform-fastify'

interface AdapterOptions {
  logger: boolean
}

/**
 * Creates a new FastifyAdapter that uses JellyfishJSON for JSON stringify and parse.
 */
export function newFastifyAdapter (options: AdapterOptions = {
  logger: true
}): FastifyAdapter {
  const adapter = new FastifyAdapter(options)
  setupJellyfishJSON(adapter)
  return adapter
}

/**
 * @param {FastifyAdapter} adapter to setup and use JellyfishJSON for setReplySerializer
 */
function setupJellyfishJSON (adapter: FastifyAdapter): void {
  adapter.getInstance().setReplySerializer(payload => {
    return JellyfishJSON.stringify(payload)
  })
}
