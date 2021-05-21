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

  expect(exception.message).toStrictEqual('404 - NotFound (/link/to): some message')
  expect(exception.code).toStrictEqual(404)
  expect(exception.type).toStrictEqual('NotFound')
  expect(exception.at).toStrictEqual(123)
  expect(exception.url).toStrictEqual('/link/to')
})
