import { JellyfishJSON, LosslessNumber } from '../src/'
import BigNumber from 'bignumber.js'

describe('parse', () => {
  describe('lossless', () => {
    /* eslint-disable @typescript-eslint/restrict-plus-operands */
    it('18 digit significant should parse as lossless without precision lost', () => {
      const obj = JellyfishJSON.parse('{"lossless":1200000000.00000001}', 'lossless')
      expect(obj.lossless.toString()).toStrictEqual('1200000000.00000001')
    })

    it('10 digit significant should parse as lossless with math operators should not have an error', () => {
      const obj = JellyfishJSON.parse('{"lossless":1200000000}', 'lossless')
      expect((obj.lossless + 1).toString()).toStrictEqual('1200000001')
    })

    it('18 digit significant should parse as lossless with math operators should throw an error', () => {
      const obj = JellyfishJSON.parse('{"lossless":1200000000.00000001}', 'lossless')
      expect(() => {
        console.log(obj.lossless + 1)
      }).toThrow(/Cannot convert to number: number would be truncated \(value: 1200000000\.00000001\)/)
    })
    /* eslint-enable @typescript-eslint/restrict-plus-operands */
  })

  describe('bignumber', () => {
    it('18 digit significant should parse as bignumber without precision lost', () => {
      const obj = JellyfishJSON.parse('{"bignumber":1200000000.00000001}', 'bignumber')
      expect(obj.bignumber.toString()).toStrictEqual('1200000000.00000001')
    })
  })

  describe('number', () => {
    it('18 digit significant should parse as number with precision lost', () => {
      const obj = JellyfishJSON.parse('{"number":1200000000.00000001}', 'number')
      expect(obj.number.toString()).not.toStrictEqual('1200000000.00000001')
    })

    it('10 digit significant should parse as number without precision lost', () => {
      const obj = JellyfishJSON.parse('{"number":1200000000}', 'number')
      expect(obj.number.toString()).toStrictEqual('1200000000')
    })
  })
})

describe('stringify', () => {
  it('should stringify number as json numeric', () => {
    const string = JellyfishJSON.stringify({
      number: Number('1200000000')
    })
    expect(string).toStrictEqual('{"number":1200000000}')
  })

  it('should stringify lossless as json numeric', () => {
    const string = JellyfishJSON.stringify({
      lossless: new LosslessNumber('1200000000.00000001')
    })
    expect(string).toStrictEqual('{"lossless":1200000000.00000001}')
  })

  it('should stringify bignumber as json number', () => {
    const string = JellyfishJSON.stringify({
      bignumber: new BigNumber('1200000000.00000001')
    })
    expect(string).toStrictEqual('{"bignumber":1200000000.00000001}')
  })
  it('should stringify bigint as json number', () => {
    const string = JellyfishJSON.stringify({
      bigint: BigInt('120000000000000001')
    })
    expect(string).toStrictEqual('{"bigint":120000000000000001}')
  })
})

it('should remap object at root with precision', () => {
  const parsed = JellyfishJSON.parse(`{
    "big": 10.4,
    "num": 1234
  }`, {
    big: 'bignumber'
  })

  expect(parsed.big instanceof BigNumber).toStrictEqual(true)
  expect(parsed.num).toStrictEqual(1234)
})
