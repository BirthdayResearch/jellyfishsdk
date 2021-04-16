import { parse } from 'lossless-json'
import { PrecisionPath, remap } from '../src/remap'
import { BigNumber } from '../src'

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

  expect(remapped.a instanceof BigNumber).toBe(true)

  expect(remapped.b[0] instanceof BigNumber).toBe(true)
  expect(remapped.b[1] instanceof BigNumber).toBe(true)

  expect(remapped.c.c1 instanceof BigNumber).toBe(true)
  expect(remapped.c.c2[0] instanceof BigNumber).toBe(true)

  expect(remapped.d.e.e1 instanceof BigNumber).toBe(true)
  expect(remapped.d.e.e2[0] instanceof BigNumber).toBe(true)
  expect(remapped.d.e.e2[1] instanceof BigNumber).toBe(true)

  expect(remapped.d.e.e3.e3a instanceof BigNumber).toBe(true)
  expect(remapped.d.e.e3.e3b[0] instanceof BigNumber).toBe(true)

  expect(remapped.d.f.g instanceof BigNumber).toBe(true)

  expect(remapped.d.f.f1).toBe(1.2)

  expect(remapped.h).toBe(1.2)
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
    expect(parsed.big instanceof BigNumber).toBe(true)
    expect(parsed.num).toBe(1000)
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
    expect(parsed.deeply.big instanceof BigNumber).toBe(true)
    expect(parsed.deeply.num).toBe(1000)
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

    expect(remapped.array[0] instanceof BigNumber).toBe(true)
    expect(remapped.array[1] instanceof BigNumber).toBe(true)
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

    expect(parsed[0].big instanceof BigNumber).toBe(true)
    expect(parsed[1].big instanceof BigNumber).toBe(true)
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

    expect(parsed[0].deeply.big instanceof BigNumber).toBe(true)
    expect(parsed[0].deeply.num).toBe(1)
    expect(parsed[1].deeply.big instanceof BigNumber).toBe(true)
    expect(parsed[1].deeply.num).toBe(1)
  })
})

describe('remap invalid mapping should succeed', () => {
  it('should ignore invalid remapping', () => {
    const parsed = parseAndRemap(`{
      "ignored": 123.4,
      "num": 1000
    }`, {
      ignored: {
        a: 'bignumber'
      }
    })
    expect(parsed.ignored).toBe(123.4)
    expect(parsed.num).toBe(1000)
  })
})
