import { TimeoutException } from '@defichain/ocean-api-core'

it('TimeoutException should format message with timeout message', () => {
  const exception = new TimeoutException(3000)
  expect(exception.message).toStrictEqual('request aborted due to timeout of 3000 ms')
})
