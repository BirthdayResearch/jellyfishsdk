import { ClientException } from '@defichain/ocean-api-core'

it('ClientException should format message as it is', () => {
  const exception = new ClientException('foo')
  expect(exception.message).toStrictEqual('foo')
})
