import { CborEncoding } from '@src/module.database/provider.level/cbor.encoding'

const obj = {
  foo: 'bar',
  bar: undefined,
  stool: null,
  lighting: 0,
  thunder: ['storm', 'water'],
  within: {
    number: 1,
    bar: 'foo',
    objects: []
  }
}

it('should encode and decode into the same json object', async () => {
  const encoded = CborEncoding.encode(obj)
  const decoded = CborEncoding.decode(encoded)

  expect(decoded).toStrictEqual(obj)
})

it('should encode object into a fairly small size with about 25% reduction', async () => {
  const encoded = CborEncoding.encode(obj)
  const json = Buffer.from(JSON.stringify(obj), 'utf-8')

  expect(encoded.length).toBeLessThan(json.length)
  expect(json.length).toStrictEqual(114)
  expect(encoded.length).toStrictEqual(85)
})
