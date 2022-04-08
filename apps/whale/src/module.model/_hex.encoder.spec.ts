import { HexEncoder } from '../module.model/_hex.encoder'

it('should encode script hex', () => {
  const hex = HexEncoder.asSHA256('1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a')
  expect(hex).toStrictEqual('3d78c27dffed5c633ec8cb3c1bab3aec7c63ff9247cd2a7646f98e4f7075cca0')
  expect(hex.length).toStrictEqual(64)
})

it('should encode height', () => {
  expect(HexEncoder.encodeHeight(0)).toStrictEqual('00000000')
  expect(HexEncoder.encodeHeight(1)).toStrictEqual('00000001')
  expect(HexEncoder.encodeHeight(255)).toStrictEqual('000000ff')
  expect(HexEncoder.encodeHeight(256)).toStrictEqual('00000100')
  expect(HexEncoder.encodeHeight(4294967295)).toStrictEqual('ffffffff')

  expect(() => {
    HexEncoder.encodeHeight(4294967296)
  }).toThrow('max 32 bits but number larger than 4294967295')
})

it('should encode vout index', () => {
  expect(HexEncoder.encodeVoutIndex(0)).toStrictEqual('00000000')
  expect(HexEncoder.encodeVoutIndex(1)).toStrictEqual('00000001')
  expect(HexEncoder.encodeVoutIndex(255)).toStrictEqual('000000ff')
  expect(HexEncoder.encodeVoutIndex(256)).toStrictEqual('00000100')
  expect(HexEncoder.encodeVoutIndex(4294967295)).toStrictEqual('ffffffff')

  expect(() => {
    HexEncoder.encodeVoutIndex(4294967296)
  }).toThrow('max 32 bits but number larger than 4294967295')
})
