import { JellyfishCore } from '@defichain/jellyfish-core'

export interface JellyfishOpts {
  wallet: boolean
}

export type Protocol = 'rpc'

export function Jellyfish(
  host: string,
  protocol: Protocol,
  opts: JellyfishOpts = {
    wallet: false,
  }
): JellyfishCore | undefined {
  if (opts.wallet) {
    return new JellyfishCore(host, protocol)
  }
  return undefined
}
