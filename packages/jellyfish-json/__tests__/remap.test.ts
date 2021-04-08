import { BigNumber, JellyfishJSON, LosslessNumber } from '../src'

it('remap deeply', () => {
  const { result: jsonObj } = JellyfishJSON.parse(`{"result": {
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
      }}`, {
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

it('should be working in array #1', async () => {
  const { result: jsonObj } = JellyfishJSON.parse(`{
    "result": {
      "value": 38,
      "customX": [
        {"nestedA": { "a1": 1, "a2": 2, "a3": 3}},
        {"nestedB": { "b1": 4, "b2": 5, "b3": 6}},
        {"nestedC": 99}
      ],
      "customY": [50, 55, 60],
      "customZ": [70, 75, 80]
    }, "error": {}, "id": 3
  }`, {
    value: 'bignumber',
    customX: { nestedA: { a2: 'bignumber' } },
    customY: 'bignumber'
  })

  expect(jsonObj.value instanceof BigNumber).toBe(true)
  expect(jsonObj.value.toString()).toBe('38')
  expect(jsonObj.customX[0].nestedA.a2 instanceof BigNumber).toBe(true)
  expect(jsonObj.customX[0].nestedA.a2.toString()).toBe('2')
  expect(jsonObj.customY.every((y: BigNumber) => y instanceof BigNumber)).toBe(true)
  expect(jsonObj.customZ.every((z: number) => typeof z === 'number')).toBe(true)
})

it('should be working in array #2', async () => {
  const jsonObj = JellyfishJSON.parse(`[
    {"group1": {"subgroup1": 4000}},
    {"group2": {"subgroup2": 5000}},
    {"group3": {"subgroup3": 6000}}
  ]`, {
    group2: { subgroup2: 'bignumber' },
    group3: { subgroup3: 'lossless' }
  })

  expect(jsonObj[0].group1.subgroup1).toBe(4000)
  expect(jsonObj[1].group2.subgroup2 instanceof BigNumber).toBe(true)
  expect(jsonObj[1].group2.subgroup2.toString()).toBe('5000')
  expect(jsonObj[2].group3.subgroup3 instanceof LosslessNumber).toBe(true)
  expect(jsonObj[2].group3.subgroup3.toString()).toBe('6000')
})

it('should throw error if unmatched precision mapping with text', async () => {
  const t: any = () => {
    return JellyfishJSON.parse('{"result":{"nested": 1, "nestedB": 1}}', {
      nested: {
        something: 'bignumber'
      }
    })
  }

  expect(t).toThrow('JellyfishJSON.parse nested: 1 with [object Object] precision is not supported')
})

it('should throw error if invalid type is converted', async () => {
  const t: any = () => {
    return JellyfishJSON.parse('{"result":{"value": {}}}', {
      value: 'bignumber'
    })
  }

  expect(t).toThrow('JellyfishJSON.parse value: [object Object] with bignumber precision is not supported')
})

it('missing property should be ignored', () => {
  const text = '{"result":{"nested":1}}'
  const object = JellyfishJSON.parse(text, {
    nested: 'number',
    invalid: 'lossless'
  })

  expect(JSON.stringify(object)).toBe(text)
})
