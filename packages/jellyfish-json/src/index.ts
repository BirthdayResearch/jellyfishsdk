import BigNumber from 'bignumber.js'
import { parse, stringify, LosslessNumber } from 'lossless-json'

export { BigNumber, LosslessNumber }

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
 * To allow manual key based customization of what precision it should be
 */
export interface PrecisionMapping {
  [key: string]: Precision | PrecisionMapping
}

/**
 * Revive lossless as a type
 */
const reviveLosslessAs = (transformer: (string: string) => any) => {
  return (key: string, value: any) => {
    if (value instanceof LosslessNumber) {
      return transformer(value.toString())
    }

    return value
  }
}

/**
 * Revive lossless with keys a type
 * @param text json string that is used to tranform to a json object
 * @param precision PrecisionMapping is a key value pair to allow revive value type
 * @returns jsonObject
 */
const reviveLosslessWithKeys = (text: string, precision: PrecisionMapping): any => {
  return remapLosslessObj(precision, parse(text))
}

/**
 * Remap lossless
 * @param precision Precision - 'bignumber', 'number', 'lossless'
 * @param losslessObj lossless json object
 * @returns losslessObj
 */
const remapLosslessObj = (precision: PrecisionMapping, losslessObj: any): any => {
  for (const k in precision) {
    if (typeof losslessObj[k] !== 'undefined') {
      const precisionType = precision[k] as Precision
      if (typeof precisionType !== 'string') {
        remapLosslessObj(precisionType, losslessObj[k])
      }
      if (losslessObj[k] instanceof LosslessNumber) {
        losslessObj[k] = revive(precisionType, losslessObj[k])
      }
    }
  }

  return losslessObj
}

/**
 * Revive target value based on type provided
 * @param precision Precision
 * @param value is used to be converted a preferred type
 * @returns converted value, 'lossless', 'bignumber', 'number'
 */
const revive = (precision: Precision, value: any): any => {
  switch (precision) {
    case 'lossless':
      return value

    case 'bignumber':
      return new BigNumber(value.toString())

    case 'number':
      return Number(value.toString())

    default:
      throw new Error(`JellyfishJSON.parse ${precision as string} precision is not supported`)
  }
}

/**
 * JellyfishJSON allows parsing of JSON with 'lossless', 'bignumber' and 'number' numeric precision.
 */
export const JellyfishJSON = {
  /**
   * @param text JSON string to parse into object.
   * @param precision Numeric precision to parse RPC payload as.
   */
  parse (text: string, precision: Precision | PrecisionMapping): any {
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

    return reviveLosslessWithKeys(text, precision)
  },

  /**
   * @param value Object to stringify, with no risk of losing precision.
   */
  stringify (value: any): string {
    const replacer = (key: string, value: any): any => {
      if (value instanceof BigNumber) {
        return new LosslessNumber(value.toString())
      }
      return value
    }

    return stringify(value, replacer)
  }
}
