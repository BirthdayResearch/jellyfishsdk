import { WhaleApiException } from './api.error'

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
export class WhaleApiValidationException extends WhaleApiException {
  /**
   * @return {ApiValidationProperty[]} that failed constraints validation
   */
  get properties (): ApiValidationProperty[] {
    const error = this.error as any
    return error.validation.properties
  }
}
