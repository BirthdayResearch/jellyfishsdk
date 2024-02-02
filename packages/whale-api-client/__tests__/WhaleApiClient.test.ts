import nock from 'nock'
import { WhaleApiClient } from '@defichain/whale-api-client/dist/whale.api.client'

//

const client = new WhaleApiClient({
  url: 'http://whale-api-test.internal',
  network: 'regtest',
  version: 'v0.0'
})

it('should requestData via GET', async () => {
  nock('http://whale-api-test.internal')
    .get('/v0.0/regtest/foo')
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
  nock('http://whale-api-test.internal')
    .post('/v0.0/regtest/bar')
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
