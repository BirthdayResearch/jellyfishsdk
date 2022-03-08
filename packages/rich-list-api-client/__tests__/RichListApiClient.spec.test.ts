import nock from 'nock'
import { RichListApiClient } from '../src/RichListApiClient'

const client = new RichListApiClient({
  url: 'http://rich-list-api-test.internal',
  network: 'unit-test',
  version: 'v0',
  timeout: 60000
})

describe('Inherit behaviors from OceanApiClient', () => {
  it('should requestData via GET', async () => {
    nock('http://rich-list-api-test.internal')
      .get('/v0/unit-test/foo')
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
    nock('http://rich-list-api-test.internal')
      .post('/v0/unit-test/bar')
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
})
