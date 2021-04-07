import { BigNumber, JellyfishJSON, LosslessNumber } from '../src/'

describe('parse', () => {
  describe('lossless', () => {
    /* eslint-disable @typescript-eslint/restrict-plus-operands */
    it('18 digit significant should parse as lossless without precision lost', () => {
      const obj = JellyfishJSON.parse('{"lossless":1200000000.00000001}', 'lossless')
      expect(obj.lossless.toString()).toBe('1200000000.00000001')
    })

    it('10 digit significant should parse as lossless with math operators should not have an error', () => {
      const obj = JellyfishJSON.parse('{"lossless":1200000000}', 'lossless')
      expect((obj.lossless + 1).toString()).toBe('1200000001')
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
      expect(obj.bignumber.toString()).toBe('1200000000.00000001')
    })
  })

  describe('number', () => {
    it('18 digit significant should parse as number with precision lost', () => {
      const obj = JellyfishJSON.parse('{"number":1200000000.00000001}', 'number')
      expect(obj.number.toString()).not.toBe('1200000000.00000001')
    })

    it('10 digit significant should parse as number without precision lost', () => {
      const obj = JellyfishJSON.parse('{"number":1200000000}', 'number')
      expect(obj.number.toString()).toBe('1200000000')
    })
  })

  describe('precision mapping', () => {
    it('specify the value to be revived as preferred type', () => {
      const jsonObj = JellyfishJSON.parse(`{
        "bestblock": "7048e23a5cb86cc7751ef63a87a0ca6e0a00a786bce8af88ae3d1292c5414954",
        "confirmations": 1,
        "value": 1200000000.00000001,
        "scriptPubKey": {
          "asm": "OP_DUP OP_HASH160 b36814fd26190b321aa985809293a41273cfe15e OP_EQUALVERIFY OP_CHECKSIG",
          "hex": "76a914b36814fd26190b321aa985809293a41273cfe15e88ac",
          "reqSigs": 1,
          "type": "pubkeyhash",
          "addresses": [ "mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU"],
          "customX": {
            "nestedX": 1200000000.00000001
          },
          "customY": {
            "nestedY": 1200000000.00000001
          }
        },
        "coinbase": true,
        "custom": 99
      }`, {
        scriptPubKey: {
          reqSigs: 'number',
          customX: {
            nestedX: 'bignumber'
          }
        },
        value: 'bignumber',
        confirmations: 'lossless'
      })

      expect(jsonObj.value instanceof BigNumber).toBe(true)
      expect(jsonObj.value.toString()).toBe('1200000000.00000001')
      expect(jsonObj.confirmations instanceof LosslessNumber).toBe(true)
      expect(jsonObj.confirmations.toString()).toBe('1')
      expect(jsonObj.scriptPubKey.reqSigs).toBe(1)
      expect(jsonObj.scriptPubKey.customX.nestedX instanceof BigNumber).toBe(true)
      expect(jsonObj.scriptPubKey.customX.nestedX.toString()).toBe('1200000000.00000001')
      expect(jsonObj.scriptPubKey.customY.nestedY).toBe(1200000000)
      expect(jsonObj.custom).toBe(99)
    })

    it('should throw error as unmatch precision mapping with resp', async () => {
      const t: any = () => {
        return JellyfishJSON.parse('{"nested": 1}', {
          nested: {
            something: 'bignumber'
          }
        })
      }

      expect(t).toThrow('JellyfishJSON.parse nested: 1 with [object Object] precision is not supported')
    })

    it('should throw error as invalid type to be converted', async () => {
      const t: any = () => {
        return JellyfishJSON.parse('{"value": {}}', {
          value: 'bignumber'
        })
      }

      expect(t).toThrow('JellyfishJSON.parse value: [object Object] with bignumber precision is not supported')
    })
  })
})

describe('stringify', () => {
  it('should stringify number as json numeric', () => {
    const string = JellyfishJSON.stringify({
      number: Number('1200000000')
    })
    expect(string).toBe('{"number":1200000000}')
  })

  it('should stringify lossless as json numeric', () => {
    const string = JellyfishJSON.stringify({
      lossless: new LosslessNumber('1200000000.00000001')
    })
    expect(string).toBe('{"lossless":1200000000.00000001}')
  })

  it('should stringify bignumber as json number', () => {
    const string = JellyfishJSON.stringify({
      bignumber: new BigNumber('1200000000.00000001')
    })
    expect(string).toBe('{"bignumber":1200000000.00000001}')
  })
})
