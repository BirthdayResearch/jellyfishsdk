import nock from 'nock'
import { OceanApiClient } from '../src'

const client = new OceanApiClient({
  url: 'http://ocean-api-test.internal',
  version: 'v0',
  network: 'mainnet'
})

it('should requestData via GET', async () => {
  nock('http://ocean-api-test.internal')
    .get('/v0/mainnet/foo')
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
  nock('http://ocean-api-test.internal')
    .post('/v0/mainnet/bar')
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
