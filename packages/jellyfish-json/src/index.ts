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
  return remapLosslessObj(parse(text), precision)
}

/**
 * Remap lossless
 * @param precision Precision - 'bignumber', 'number', 'lossless'
 * @param losslessObj lossless json object
 * @returns losslessObj
 */
const remapLosslessObj = (losslessObj: any, precision: PrecisionMapping): any => {
  for (const k in losslessObj) {
    const precisionType = precision[k] as Precision

    // parsing invalid type
    // eg: parsing empty object to bignumber
    if (typeof losslessObj[k] === 'object' && Object.keys(losslessObj[k]).length === 0) {
      throw new Error(`JellyfishJSON.parse ${losslessObj[k] as string} with ${precisionType as string} precision is not supported`)

      // unmatch precision parse
      // eg: {nested: 1} parsed by {nested: { something: 'bignumber'}}
    } else if (typeof precisionType === 'object' && losslessObj[k] instanceof LosslessNumber) {
      throw new Error(`JellyfishJSON.parse ${k}: ${losslessObj[k] as string} with ${precisionType as string} precision is not supported`)

    // convert type based on precision
    } else if (typeof precisionType === 'string' && losslessObj[k] instanceof LosslessNumber) {
      losslessObj[k] = revive(precisionType, losslessObj[k])

    // loop nested precistionType
    // { parent: { child: { nestedChild: { 'bignumber' }}}}
    } else if (typeof precisionType === 'object') {
      remapLosslessObj(losslessObj[k], precisionType)

    // convert to number by default
    } else if (losslessObj[k] instanceof LosslessNumber) {
      losslessObj[k] = revive('number', losslessObj[k])

    // loop nested losslessObj
    } else if (typeof losslessObj[k] === 'object' && !(losslessObj[k] instanceof LosslessNumber)) {
      remapLosslessObj(losslessObj[k], precision)
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
