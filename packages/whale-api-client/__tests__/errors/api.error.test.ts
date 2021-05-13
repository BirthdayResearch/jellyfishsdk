import { WhaleApiError, WhaleApiErrorType, WhaleApiException } from '../../src'

it('WhaleApiException should be formatted as', () => {
  const error: WhaleApiError = {
    code: 404,
    type: WhaleApiErrorType.NotFound,
    at: 123,
    message: 'some message',
    url: '/link/to'
  }

  const exception = new WhaleApiException(error)

  expect(exception.message).toBe('404 - NotFound (/link/to): some message')
  expect(exception.code).toBe(404)
  expect(exception.type).toBe('NotFound')
  expect(exception.at).toBe(123)
  expect(exception.url).toBe('/link/to')
})
