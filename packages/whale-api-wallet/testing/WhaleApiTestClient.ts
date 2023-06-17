import { ApiMethod, ResponseAsString, WhaleApiClient } from '@defichain/whale-api-client'

/**
 * WhaleApiClient for testing purposes.
 * This is mainly used for unit testing purposes, and may
 * not be able to catch some edge cases when used in real life
 * scenarios.
 */
export class WhaleApiTestClient extends WhaleApiClient {
  private mockReturnval: Record<string, any> = {}
  constructor () {
    super({ url: 'test' })
    this.mockMethods()
  }

  async requestAsString (method: ApiMethod, path: string, body?: string): Promise<ResponseAsString> {
    // stub the api method thus test case logic should not reach this point
    throw new Error(`Endpoint "${method}/${path}" not stubbed for test`)
  }

  private mockMethods (): void {
    this.fee.estimate = async (confirmationTarget?: number) => {
      return await Promise.resolve(this.mockReturnval['fee.estimate'] ?? 0)
    }
  }

  public setMockReturnVal (methodsSig: string, val: any): void {
    this.mockReturnval[methodsSig] = val
  }

  public clearMockReturnVal (): void {
    this.mockReturnval = {}
  }
}
