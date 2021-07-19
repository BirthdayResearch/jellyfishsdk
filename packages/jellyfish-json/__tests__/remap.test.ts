import { LosslessNumber, parse } from 'lossless-json'
import { PrecisionPath, remap } from '../src/remap'
import BigNumber from 'bignumber.js'

it('should remap everything in the path', () => {
  const losslessObj = parse(`
  {
    "a": 1.2,
    "b": [1.2, 1.2],
    "c": { "c1": 1.2, "c2": [1.2] },
    "d": {
      "e": {
        "e1": 1.2,
        "e2": [1.2, 1.2],
        "e3": { "e3a": 1.2, "e3b": [1.2] }
      },
      "f": {
        "g": 1.2,
        "f1": 1.2
      }
    },
    "h": 1.2
  }
  `)
  const remapped = remap(losslessObj, {
    a: 'bignumber',
    b: 'bignumber',
    c: 'bignumber',
    d: {
      e: 'bignumber',
      f: {
        g: 'bignumber'
      }
    }
  })

  expect(remapped.a instanceof BigNumber).toStrictEqual(true)

  expect(remapped.b[0] instanceof BigNumber).toStrictEqual(true)
  expect(remapped.b[1] instanceof BigNumber).toStrictEqual(true)

  expect(remapped.c.c1 instanceof BigNumber).toStrictEqual(true)
  expect(remapped.c.c2[0] instanceof BigNumber).toStrictEqual(true)

  expect(remapped.d.e.e1 instanceof BigNumber).toStrictEqual(true)
  expect(remapped.d.e.e2[0] instanceof BigNumber).toStrictEqual(true)
  expect(remapped.d.e.e2[1] instanceof BigNumber).toStrictEqual(true)

  expect(remapped.d.e.e3.e3a instanceof BigNumber).toStrictEqual(true)
  expect(remapped.d.e.e3.e3b[0] instanceof BigNumber).toStrictEqual(true)

  expect(remapped.d.f.g instanceof BigNumber).toStrictEqual(true)

  expect(remapped.d.f.f1).toStrictEqual(1.2)

  expect(remapped.h).toStrictEqual(1.2)
})

function parseAndRemap (text: string, precision: PrecisionPath): any {
  const losslessObj = parse(text)
  return remap(losslessObj, precision)
}

describe('remap individually', () => {
  it('should remap object at root with precision', () => {
    const parsed = parseAndRemap(`{
      "big": 123.4,
      "num": 1000
    }`, {
      big: 'bignumber'
    })
    expect(parsed.big instanceof BigNumber).toStrictEqual(true)
    expect(parsed.num).toStrictEqual(1000)
  })

  it('should remap object deeply with precision', () => {
    const parsed = parseAndRemap(`{
      "deeply": {
        "big": 123,
        "num": 1000
      }
    }`, {
      deeply: {
        big: 'bignumber'
      }
    })
    expect(parsed.deeply.big instanceof BigNumber).toStrictEqual(true)
    expect(parsed.deeply.num).toStrictEqual(1000)
  })

  it('should remap array value with precision', () => {
    const remapped = parseAndRemap(`{
      "array": [
        100,
        200
      ]
    }`, {
      array: 'bignumber'
    })

    expect(remapped.array[0] instanceof BigNumber).toStrictEqual(true)
    expect(remapped.array[1] instanceof BigNumber).toStrictEqual(true)
  })

  it('should remap array object with precision', () => {
    const parsed = parseAndRemap(`[
      {
        "big": 100
      },
      {
        "big": 200.2
      }
    ]`, {
      big: 'bignumber'
    })

    expect(parsed[0].big instanceof BigNumber).toStrictEqual(true)
    expect(parsed[1].big instanceof BigNumber).toStrictEqual(true)
  })

  it('should remap array object with precision deeply', () => {
    const parsed = parseAndRemap(`[
      {
        "deeply": {
          "big": 123,
          "num": 1
        }
      },
      {
        "deeply": {
          "big": 123.4,
          "num": 1
        }
      }
    ]`, {
      deeply: {
        big: 'bignumber'
      }
    })

    expect(parsed[0].deeply.big instanceof BigNumber).toStrictEqual(true)
    expect(parsed[0].deeply.num).toStrictEqual(1)
    expect(parsed[1].deeply.big instanceof BigNumber).toStrictEqual(true)
    expect(parsed[1].deeply.num).toStrictEqual(1)
  })
})

it('should remap lossless | number | bignumber', () => {
  const parsed = parseAndRemap(`{
      "a": 1,
      "b": 2,
      "c": 3
    }`, {
    a: 'bignumber',
    b: 'lossless',
    c: 'number'
  })

  expect(parsed.a instanceof BigNumber).toStrictEqual(true)
  expect(parsed.a.toString()).toStrictEqual('1')

  expect(parsed.b instanceof LosslessNumber).toStrictEqual(true)
  expect(parsed.b.toString()).toStrictEqual('2')

  expect(parsed.c).toStrictEqual(3)
})

describe('remap invalid mapping should succeed', () => {
  it('should ignore invalid mapping', () => {
    const parsed = parseAndRemap(`{
      "ignored": 123.4,
      "num": 1000
    }`, {
      ignored: {
        a: 'bignumber'
      }
    })
    expect(parsed.ignored).toStrictEqual(123.4)
    expect(parsed.num).toStrictEqual(1000)
  })

  it('should ignore invalid null object', () => {
    remap({
      invalid: null
    }, {
      invalid: 'bignumber'
    })
  })

  it('should ignore invalid undefined object', () => {
    remap({
      invalid: undefined
    }, {
      invalid: 'bignumber'
    })
  })

  it('should ignore invalid null mapping', () => {
    parseAndRemap(`{
      "invalid": 123.4,
      "num": 1000
    }`, {
      // @ts-expect-error
      invalid: undefined
    })
  })

  it('should ignore invalid undefined mapping', () => {
    parseAndRemap(`{
      "invalid": 123.4,
      "num": 1000
    }`, {
      // @ts-expect-error
      invalid: undefined
    })
  })
})
