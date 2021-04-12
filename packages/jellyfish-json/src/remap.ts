import BigNumber from 'bignumber.js'
import { LosslessNumber, parse } from 'lossless-json'
import { Precision } from './index'

/**
 * Manual key based mapping of each precision value
 */
export interface PrecisionMapping {
  [key: string]: Precision | PrecisionMapping
}

enum MappingAction {
  NONE = 0,
  PRECISION = 1,
  PRECISION_LOOP = 2,
  DEEPLY_PRECISION_MAPPING = 3,
  DEFAULT_NUMBER = 4,
  DEEPLY_UNKNOWN = 5
}

/**
 * Remap lossless object with PrecisionMapping for each keys.
 *
 * @param text json string that is used to transform to a json object
 * @param precision PrecisionMapping is a key value pair to allow revive value type
 */
export function remap (text: string, precision: PrecisionMapping): any {
  const losslessObj = parse(text)

  if (Array.isArray(losslessObj)) {
    return losslessObj.map((v: any) => {
      const errMsg = validate(v, precision)
      if (errMsg !== undefined) throw new Error(errMsg)
      return remapLosslessObj(v, precision)
    })
  }

  const errMsg = validate(losslessObj, precision)
  if (errMsg !== undefined) throw new Error(errMsg)
  return remapLosslessObj(losslessObj, precision)
}

function validate (losslessObj: any, precision: PrecisionMapping): string | undefined {
  for (const k in losslessObj) {
    const type = precision[k]
    const value = losslessObj[k]

    // throw err if invalid type conversion found
    if (!isValid(value, type as Precision)) {
      return `JellyfishJSON.parse ${k}: ${value as string} with ${type as string} precision is not supported`
    } else if (isNestedObject(value)) {
      return validate(value, precision)
    }
  }
}

function isNestedObject (value: any): boolean {
  return typeof value === 'object' && !(value instanceof LosslessNumber)
}

/**
 * Validate the losslessObj type with precisionType
 *
 * @param value losslessObj value
 * @param precisionType Precision
 */
function isValid (value: any, precisionType: Precision): boolean {
  if (value instanceof LosslessNumber && typeof precisionType === 'object') {
    // validation #1: unmatched precision parse
    // eg: [LosslessObj] {nested: 1} parsed by [PrecisionMapping] {nested: { something: 'bignumber'}}
    return false
  }

  if (typeof value === 'object' && Object.keys(value).length === 0) {
    // validation #2: parsing invalid type
    // eg: parsing empty object to bignumber
    return false
  }

  return true
}

/**
 * @param losslessObj lossless json object
 * @param precision Precision - 'bignumber', 'number', 'lossless'
 */
function remapLosslessObj (losslessObj: any, precision: PrecisionMapping): any {
  for (const k in losslessObj) {
    const type: Precision | PrecisionMapping = precision[k]

    switch (getAction(losslessObj[k], type)) {
      case MappingAction.PRECISION:
        losslessObj[k] = mapValue(losslessObj[k], type as Precision)
        break

      case MappingAction.PRECISION_LOOP:
        losslessObj[k] = (losslessObj[k] as any[]).map(v => mapValue(v, type as Precision))
        break

      case MappingAction.DEFAULT_NUMBER:
        losslessObj[k] = mapValue(losslessObj[k], 'number')
        break

      case MappingAction.DEEPLY_PRECISION_MAPPING:
        remapLosslessObj(losslessObj[k], type as PrecisionMapping)
        break

      case MappingAction.DEEPLY_UNKNOWN:
        remapLosslessObj(losslessObj[k], precision)
        break
    }
  }

  return losslessObj
}

function getAction (value: any, type: Precision | PrecisionMapping): MappingAction {
  // typed with precision
  if (typeof type === 'string' && value instanceof LosslessNumber) {
    return MappingAction.PRECISION
  }

  if (typeof type === 'string' && Array.isArray(value)) {
    return MappingAction.PRECISION_LOOP
  }

  // deeply with mapping
  if (typeof type === 'object') {
    return MappingAction.DEEPLY_PRECISION_MAPPING
  }

  // number as default
  if (value instanceof LosslessNumber) {
    return MappingAction.DEFAULT_NUMBER
  }

  // deeply with unknown
  if (typeof value === 'object') {
    return MappingAction.DEEPLY_UNKNOWN
  }

  return MappingAction.NONE
}

/**
 * @param precision Precision
 * @param value is used to be converted a preferred type
 * @returns converted value, 'lossless', 'bignumber', 'number'
 */
function mapValue (value: LosslessNumber, precision: Precision): LosslessNumber | BigNumber | Number {
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
