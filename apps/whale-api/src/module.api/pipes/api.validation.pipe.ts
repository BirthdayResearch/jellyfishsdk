import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common'
import { ApiErrorType, ApiException } from '../../module.api/_core/api.error'

export class ApiValidationPipe extends ValidationPipe {
  constructor () {
    super({
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        return new ValidationApiException(errors)
      }
    })
  }
}

export interface ApiValidationProperty {
  property: string
  value?: string
  constraints?: string[]
  properties?: ApiValidationProperty[]
}

export class ValidationApiException extends ApiException {
  constructor (errors: ValidationError[]) {
    super({
      code: HttpStatus.UNPROCESSABLE_ENTITY,
      type: ApiErrorType.ValidationError,
      at: Date.now(),
      validation: {
        properties: errors.map(ValidationApiException.mapProperty)
      }
    })
  }

  static mapProperty (error: ValidationError): ApiValidationProperty {
    function mapConstraints (): string[] | undefined {
      if (error.constraints !== undefined) {
        return Object.values(error.constraints)
      }
      return undefined
    }

    function mapProperties (): ApiValidationProperty[] | undefined {
      if (error?.children !== undefined && error?.children.length > 0) {
        return error?.children.map(error => {
          return ValidationApiException.mapProperty(error)
        })
      }
      return undefined
    }

    return {
      property: error.property,
      value: error.value,
      constraints: mapConstraints(),
      properties: mapProperties()
    }
  }
}
