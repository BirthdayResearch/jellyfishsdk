import nock from 'nock'
import { RichListApiClient } from '../src/RichListApiClient'

const client = new RichListApiClient({
  url: 'http://rich-list-api-test.internal',
  network: 'unit-test',
  version: 'v99'
})

describe('RichListApiClient - get', () => {
  it('Should be able to retrieve latest rich list', async () => {
    nock('http://rich-list-api-test.internal')
      .get('/v99/unit-test/rich-list/1')
      .reply(200, function () {
        return {
          data: [
            { address: 'abc', amount: 123 },
            { address: 'xyz', amount: 100 }
          ]
        }
      })

    const richList = await client.get('1')
    expect(richList.length).toStrictEqual(2)
    expect(richList[0].address).toStrictEqual('abc')
    expect(richList[0].amount).toStrictEqual(123)
    expect(richList[1].address).toStrictEqual('xyz')
    expect(richList[1].amount).toStrictEqual(100)
  })
})
