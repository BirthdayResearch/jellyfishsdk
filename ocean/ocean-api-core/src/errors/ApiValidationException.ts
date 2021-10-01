import { ApiException } from './ApiException'

/**
 * Each property that failed constraint
 */
export interface ApiValidationProperty {
  property: string
  value?: any
  constraints?: string[]
  properties?: ApiValidationProperty[]
}

/**
 * Rich constraints validation error coming from DeFi Whale API.
 */
export class ApiValidationException extends ApiException<{ properties: ApiValidationProperty[] }> {
  /**
   * @return {ApiValidationProperty[]} that failed constraints validation
   */
  get properties (): ApiValidationProperty[] {
    return this.error.payload.properties
  }
}
