import { raiseIfError, WhaleApiError, WhaleApiErrorType } from '../../src'
import { WhaleApiValidationException } from '../../src/errors/api.validation.exception'
import { WhaleApiException } from '../../src/errors/api.error'

it('should raise if error', () => {
  const error: WhaleApiError = {
    code: 400,
    type: WhaleApiErrorType.BadRequest,
    at: 123456,
    message: 'bad request',
    url: '/link/to/bad/request'
  }

  const throwError = (): void => {
    raiseIfError({
      data: undefined,
      error: error
    })
  }

  expect(throwError).toThrow('400 - BadRequest (/link/to/bad/request): bad request')
  expect(throwError).toThrow(WhaleApiException)
})

it('should raise validation error', () => {
  const error: WhaleApiError = {
    code: 422,
    type: WhaleApiErrorType.ValidationError,
    at: 123456,
    message: 'validation error',
    url: '/link/to/validationerror/request'
  }

  const throwError = (): void => {
    raiseIfError({
      data: undefined,
      error: error
    })
  }
  expect(throwError).toThrow('422 - ValidationError (/link/to/validationerror/request): validation error')
  expect(throwError).toThrow(WhaleApiValidationException)
})

it('should not raise  error if error is undefined', () => {
  expect(() => {
    raiseIfError({
      data: undefined,
      error: undefined
    })
  }).not.toThrow()
})
