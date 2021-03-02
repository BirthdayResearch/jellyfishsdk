import {JellyfishClient, JellyfishError, Payload} from '@defichain/jellyfish-core'
import fetch from 'cross-fetch'
import JSONBig from 'json-bigint'

/**
 * A JSON-RPC client implementation for connecting to a DeFiChain node.
 */
export class JellyfishJsonRpc extends JellyfishClient {
  private readonly url: string

  /**
   * Construct a Jellyfish client to connect to a DeFiChain node via JSON-RPC.
   *
   * @param url
   */
  constructor(url: string) {
    super()
    this.url = url
  }

  async call<T>(method: string, payload: Payload): Promise<T> {
    const body = JellyfishJsonRpc.stringify(method, payload)
    const response = await fetch(this.url, {
      method: 'POST',
      body: body,
    })

    return await JellyfishJsonRpc.parse<T>(response)
  }

  static async parse<T>(response: Response): Promise<T> {
    if (response.status !== 200) {
      throw new JellyfishError(response.statusText, response.status)
    }

    // TODO(fuxingloh): validation?
    const text = await response.text()
    const data = JSONBig.parse(text)
    return data.result
  }

  static stringify(method: string, payload: Payload): string {
    return JSONBig.stringify({
      jsonrpc: '1.0',
      id: Math.floor(Math.random() * 10000000000000000),
      method: method,
      params: payload,
    })
  }
}
