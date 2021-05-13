import { raiseIfError, WhaleApiError, WhaleApiErrorType } from '../../src'

it('should raise if error', () => {
  const error: WhaleApiError = {
    code: 400,
    type: WhaleApiErrorType.BadRequest,
    at: 123456,
    message: 'bad request',
    url: '/link/to/bad/request'
  }

  expect(() => {
    raiseIfError({
      data: undefined,
      error: error
    })
  }).toThrow('400 - BadRequest (/link/to/bad/request): bad request')
})
