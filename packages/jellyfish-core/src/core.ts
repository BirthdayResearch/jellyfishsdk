import * as methods from './methods'
import {Client, Payload, JellyfishError} from './api'
export {methods, Client, Payload, JellyfishError}

/**
 * Protocol agnostic DeFiChain node client, APIs separated into their category.
 */
export abstract class JellyfishClient implements Client {
  readonly blockchain = new methods.Blockchain(this)
  readonly mining = new methods.Mining(this)
  readonly network = new methods.Network(this)
  readonly wallet = new methods.Wallet(this)

  // TODO(fuxingloh): all rpc categories to be implemented after RFC

  /**
   * Abstracted isomorphic promise based procedure call handling
   */
  abstract call<T>(method: string, payload: Payload): Promise<T>
}
