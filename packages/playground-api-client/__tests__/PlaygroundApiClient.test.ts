import nock from 'nock'
import { PlaygroundApiClient } from '@defichain/playground-api-client'

const client = new PlaygroundApiClient({
  url: 'http://playground-api-test.internal',
  version: 'v0'
})

it('should requestData via GET', async () => {
  nock('http://playground-api-test.internal')
    .get('/v0/playground/foo')
    .reply(200, function () {
      return {
        data: {
          bar: ['1', '2']
        }
      }
    })

  const result = await client.requestData('GET', 'foo')
  await expect(result).toStrictEqual({
    bar: ['1', '2']
  })
})

it('should requestData via POST', async () => {
  nock('http://playground-api-test.internal')
    .post('/v0/playground/bar')
    .reply(200, function (_, body: object) {
      return {
        data: body
      }
    })

  const result = await client.requestData('POST', 'bar', {
    abc: ['a', 'b', 'c']
  })
  await expect(result).toStrictEqual({
    abc: ['a', 'b', 'c']
  })
})
