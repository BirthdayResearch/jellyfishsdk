/**
 * Temporary solution before `@defichain/whale-api-client` refactored into monorepo
 * Direct via npm, has some conflict with compiler as package name match `@defichain/*` path pattern
 */
export interface AddressApi {
  getBalance: (address: string) => Promise<string>
}

export interface WhaleApiClient {
  address: AddressApi
}
