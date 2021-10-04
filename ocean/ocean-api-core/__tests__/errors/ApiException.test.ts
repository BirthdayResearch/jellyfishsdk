import { ApiErrorType, ApiException, ApiValidationException, ApiValidationProperty } from '@defichain/ocean-api-core'

it('raiseIfError should not raise error if no error', () => {
  ApiException.raiseIfError({ data: undefined })
})

it('raiseIfError should raise Unrecognized Error if not structured properly', () => {
  const response = {
    data: 'data',
    error: 'something'
  }

  expect(() => {
    ApiException.raiseIfError(response as any)
  }).toThrow('Unrecognized Error: {"data":"data","error":"something"}')
})

describe('raise all error types', () => {
  it('should raise ValidationError', () => {
    expect.assertions(6)

    const properties: ApiValidationProperty[] = [
      {
        property: 'a',
        value: 'b'
      }
    ]

    try {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 422,
          type: ApiErrorType.ValidationError,
          at: 1633280252888,
          message: 'message',
          url: '/validation',
          payload: {
            properties: properties
          }
        }
      })
    } catch (e) {
      const exception = e as ApiValidationException
      expect(exception.code).toStrictEqual(422)
      expect(exception.type).toStrictEqual(ApiErrorType.ValidationError)
      expect(exception.at).toStrictEqual(1633280252888)
      expect(exception.url).toStrictEqual('/validation')
      expect(exception.properties).toStrictEqual(properties)

      expect(exception.message).toStrictEqual('422 - ValidationError (/validation) : message')
    }
  })

  it('should raise BadRequest', () => {
    expect(() => {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 400,
          type: ApiErrorType.BadRequest,
          at: 1633280252888,
          message: 'message',
          url: '/raise',
          payload: undefined
        }
      })
    }).toThrow('400 - BadRequest (/raise) : message')
  })

  it('should raise NotFound', () => {
    expect(() => {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 404,
          type: ApiErrorType.NotFound,
          at: 1633280252888,
          message: 'message',
          url: '/raise',
          payload: undefined
        }
      })
    }).toThrow('404 - NotFound (/raise) : message')
  })

  it('should raise Conflict', () => {
    expect(() => {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 409,
          type: ApiErrorType.Conflict,
          at: 1633280252888,
          message: 'message',
          url: '/raise',
          payload: undefined
        }
      })
    }).toThrow('409 - Conflict (/raise) : message')
  })

  it('should raise Forbidden', () => {
    expect(() => {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 403,
          type: ApiErrorType.Forbidden,
          at: 1633280252888,
          message: 'message',
          url: '/raise',
          payload: undefined
        }
      })
    }).toThrow('403 - Forbidden (/raise) : message')
  })

  it('should raise Unauthorized', () => {
    expect(() => {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 401,
          type: ApiErrorType.Unauthorized,
          at: 1633280252888,
          message: 'message',
          url: '/raise',
          payload: undefined
        }
      })
    }).toThrow('401 - Unauthorized (/raise) : message')
  })

  it('should raise BadGateway', () => {
    expect(() => {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 502,
          type: ApiErrorType.BadGateway,
          at: 1633280252888,
          message: 'message',
          url: '/raise',
          payload: undefined
        }
      })
    }).toThrow('502 - BadGateway (/raise) : message')
  })

  it('should raise ServiceUnavailable', () => {
    expect(() => {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 503,
          type: ApiErrorType.ServiceUnavailable,
          at: 1633280252888,
          message: 'message',
          url: '/raise',
          payload: undefined
        }
      })
    }).toThrow('503 - ServiceUnavailable (/raise) : message')
  })

  it('should raise TimeoutError', () => {
    expect(() => {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 408,
          type: ApiErrorType.TimeoutError,
          at: 1633280252888,
          message: 'message',
          url: '/raise',
          payload: undefined
        }
      })
    }).toThrow('408 - TimeoutError (/raise) : message')
  })

  it('should raise UnknownError', () => {
    expect(() => {
      ApiException.raiseIfError({
        data: undefined,
        error: {
          code: 500,
          type: ApiErrorType.UnknownError,
          at: 1633280252888,
          message: 'message',
          url: '/raise',
          payload: undefined
        }
      })
    }).toThrow('500 - UnknownError (/raise) : message')
  })
})
