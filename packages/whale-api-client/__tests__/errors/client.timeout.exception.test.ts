import { WhaleClientTimeoutException } from '../../src'

it('WhaleClientTimeoutException should be structured as', () => {
  const exception = new WhaleClientTimeoutException(15000)

  expect(exception.message).toStrictEqual('request aborted due to timeout of 15000 ms')
})
