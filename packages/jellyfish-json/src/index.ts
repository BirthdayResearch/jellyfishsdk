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

const Action = {
  NULL: 0,
  CONV_BASED_PRECISION: 1,
  LOOP_PRECISION_TYPE: 2,
  CONV_NUM_BY_DEFAULT: 3,
  LOOP_NESTED_LOSSLESSOBJ: 4
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
function reviveLosslessWithKeys (text: string, precision: PrecisionMapping): any {
  return remapLosslessObj(parse(text), precision)
}

/**
 * Remap lossless
 * @param precision Precision - 'bignumber', 'number', 'lossless'
 * @param losslessObj lossless json object
 * @returns losslessObj
 */
function remapLosslessObj (losslessObj: any, precision: PrecisionMapping): any {
  for (const k in losslessObj) {
    const precisionType = precision[k]

    // throw err if invalid type conversion found
    if (!isValid(losslessObj[k], precisionType as Precision)) {
      throw new Error(`JellyfishJSON.parse ${k}: ${losslessObj[k] as string} with ${precisionType as string} precision is not supported`)
    }

    const action: number = getAction(losslessObj[k], precisionType as Precision)

    switch (action) {
      case Action.CONV_BASED_PRECISION:
        losslessObj[k] = revive(precisionType as Precision, losslessObj[k])
        break

      case Action.LOOP_PRECISION_TYPE:
        remapLosslessObj(losslessObj[k], precisionType as PrecisionMapping)
        break

      case Action.CONV_NUM_BY_DEFAULT:
        losslessObj[k] = revive('number', losslessObj[k])
        break

      case Action.LOOP_NESTED_LOSSLESSOBJ:
        remapLosslessObj(losslessObj[k], precision)
        break

      default:
        break
    }
  }

  return losslessObj
}

/**
 *
 * @param value LosslessObj value
 * @param precisionType Precision
 */
function getAction (value: any, precisionType: Precision): number {
  // convert type based on precision
  if (typeof precisionType === 'string' && value instanceof LosslessNumber) {
    return Action.CONV_BASED_PRECISION
  }

  // loop nested precistionType
  // { parent: { child: { nestedChild: { 'bignumber' }}}}
  if (typeof precisionType === 'object') {
    return Action.LOOP_PRECISION_TYPE
  }

  // convert to number by default
  if (value instanceof LosslessNumber) {
    return Action.CONV_NUM_BY_DEFAULT
  }

  // loop nested losslessObj
  if (typeof value === 'object' && !(value instanceof LosslessNumber)) {
    return Action.LOOP_NESTED_LOSSLESSOBJ
  }

  return Action.NULL
}

/**
 * To validatie the losslessObj type with precisionType in type conversion loops
 *
 * @param key losslessObj key
 * @param value losslessObj value
 * @param precisionType Precision
 */
function isValid (value: any, precisionType: Precision): boolean {
  if (
    // validation #1: parsing invalid type
    // eg: parsing empty object to bignumber
    (typeof value === 'object' && Object.keys(value).length === 0) ||

    // validation #2: unmatch precision parse
    // eg: [LosslessObj] {nested: 1} parsed by [PrecisionMapping] {nested: { something: 'bignumber'}}
    (typeof precisionType === 'object' && value instanceof LosslessNumber)
  ) {
    return false
  }

  return true
}

/**
 * Revive target value based on type provided
 * @param precision Precision
 * @param value is used to be converted a preferred type
 * @returns converted value, 'lossless', 'bignumber', 'number'
 */
function revive (precision: Precision, value: any): any {
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
