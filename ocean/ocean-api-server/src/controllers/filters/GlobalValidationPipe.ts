import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common'
import { ApiErrorType, ApiValidationException, ApiValidationProperty } from '@defichain/ocean-api-core'

export class GlobalValidationPipe extends ValidationPipe {
  constructor () {
    super({
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        return new ApiValidationException({
          code: HttpStatus.UNPROCESSABLE_ENTITY,
          type: ApiErrorType.ValidationError,
          at: Date.now(),
          payload: {
            properties: errors.map(mapProperty)
          }
        })
      }
    })
  }
}

function mapProperty (error: ValidationError): ApiValidationProperty {
  function mapConstraints (): string[] | undefined {
    if (error.constraints !== undefined) {
      return Object.values(error.constraints)
    }
    return undefined
  }

  function mapProperties (): ApiValidationProperty[] | undefined {
    if (error?.children !== undefined && error?.children.length > 0) {
      return error?.children.map(error => {
        return mapProperty(error)
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
