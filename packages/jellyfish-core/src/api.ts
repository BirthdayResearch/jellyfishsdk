/**
 * Payload to send to DeFiChain node
 */
/* eslint @typescript-eslint/no-explicit-any: off */
export type Payload = any

export type Call<T> = (method: string, payload: Payload) => Promise<T>
export type Client = {call: Call<any>}

export class JellyfishError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}
