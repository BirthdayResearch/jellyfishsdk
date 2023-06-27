import BigNumber from 'bignumber.js'
import { LosslessNumber, parse, stringify } from 'lossless-json'
import { PrecisionPath, remap } from './remap'

export { BigNumber, LosslessNumber, PrecisionPath }

/**
 * Numeric precision to parse RPC payload as.
 *
 * 'lossless' uses LosslessJSON that parses numeric values as LosslessNumber. With LosslessNumber, one can perform
 * regular numeric operations, and it will throw an error when this would result in losing information.
 *
 * 'bignumber' parse all numeric values as 'BigNumber' using bignumber.js library.
 *
 * 'number' parse all numeric values as 'Number' and precision will be loss if it exceeds IEEE-754 standard.
 */
export type Precision = 'lossless' | 'bignumber' | 'number'

/**
 * Revive lossless as a type
 */
function reviveLosslessAs (transformer: (string: string) => any) {
  return (key: string, value: any) => {
    if (value instanceof LosslessNumber) {
      return transformer(value.toString())
    }

    return value
  }
}

/**
 * JellyfishJSON allows parsing of JSON with 'lossless', 'bignumber' and 'number' numeric precision.
 */
export const JellyfishJSON = {
  /**
   * Precision parses all numeric value as the given Precision.
   *
   * PrecisionPath selectively remap each numeric value based on the mapping provided,
   * defaults to number if precision is not provided for the key. This works deeply.
   *
   * @param {string} text JSON string to parse into object.
   * @param {Precision | PrecisionPath} precision Numeric precision to parse payload as.
   */
  parse (text: string, precision: Precision | PrecisionPath): any {
    if (typeof precision === 'string') {
      switch (precision) {
        case 'lossless':
          return parse(text)

        case 'bignumber':
          return parse(text, reviveLosslessAs(string => new BigNumber(string)))

        case 'number':
          return parse(text, reviveLosslessAs(string => Number(string)))

        default:
          throw new Error(`JellyfishJSON.parse ${precision as string} precision is not supported`)
      }
    }

    const losslessObj = parse(text)
    return remap(losslessObj, precision)
  },

  /**
   * @param {any} value object to stringify, with no risk of losing precision.
   */
  stringify (value: any): string {
    function replacer (key: string, value: any): any {
      if (value instanceof BigNumber) {
        return new LosslessNumber(value.toString())
      }
      if (typeof value === 'bigint') {
        return new LosslessNumber(value.toString())
      }
      return value
    }

    return stringify(value, replacer)
  }
}
