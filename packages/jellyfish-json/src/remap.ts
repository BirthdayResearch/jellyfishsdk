import BigNumber from 'bignumber.js'
import { LosslessNumber } from 'lossless-json'
import { Precision } from './index'

/**
 * Path based precision mapping
 * Specifying 'bignumber' will automatically map all Number in that path as 'bignumber'.
 * Otherwise, it will default to number, This applies deeply.
 *
 * @example
 * path = {
 *   a: 'bignumber',
 *   b: {
 *     c: 'bignumber'
 *   }
 * }
 * value = {
 *   a: BigNumber,
 *   b: {
 *     c: {
 *       d: BigNumber,
 *       e: [BigNumber, BigNumber]
 *     },
 *     f: number
 *   },
 *   g: number
 * }
 */
export interface PrecisionPath {
  [path: string]: Precision | PrecisionPath
}

/**
 * @param {any} losslessObj to deeply remap into bignumber or number.
 * @param {'bignumber' | PrecisionPath} precision path mapping
 */
export function remap (losslessObj: any, precision: PrecisionPath): any {
  return deepRemap(losslessObj, precision)
}

/**
 * @param {any} losslessObj to deeply remap
 * @param {'bignumber' | PrecisionPath} precision path mapping
 */
function deepRemap (losslessObj: any, precision: Precision | PrecisionPath): any {
  if (losslessObj === null || losslessObj === undefined) {
    return losslessObj
  }

  if (typeof precision !== 'object') {
    return reviveAs(losslessObj, precision)
  }

  if (Array.isArray(losslessObj)) {
    return losslessObj.map(obj => deepRemap(obj, precision))
  }

  if (losslessObj instanceof LosslessNumber) {
    return reviveLosslessAs(losslessObj)
  }

  for (const [key, value] of Object.entries(losslessObj)) {
    losslessObj[key] = deepRemap(value, precision[key])
  }
  return losslessObj
}

/**
 * Array will deeply remapped, object keys will be iterated on as keys.
 *
 * @param {any} losslessObj to revive
 * @param precision to use, specific 'bignumber' for BigNumber or values always ignored and default to number
 */
function reviveAs (losslessObj: any, precision?: Precision): any {
  if (losslessObj === null || losslessObj === undefined) {
    return losslessObj
  }

  if (losslessObj instanceof LosslessNumber) {
    return reviveLosslessAs(losslessObj, precision)
  }

  if (Array.isArray(losslessObj)) {
    return losslessObj.map((v: any) => reviveAs(v, precision))
  }

  if (typeof losslessObj === 'object') {
    for (const [key, value] of Object.entries(losslessObj)) {
      losslessObj[key] = reviveAs(value, precision)
    }
  }

  return losslessObj
}

/**
 * @param {LosslessNumber} losslessNum to revive as bignumber or number if precision != bignumber
 * @param {Precision} precision to use, specific 'bignumber' for BigNumber else always default to number
 */
function reviveLosslessAs (losslessNum: LosslessNumber, precision?: Precision): BigNumber | LosslessNumber | number {
  if (precision === 'lossless') {
    return losslessNum
  }

  if (precision === 'bignumber') {
    return new BigNumber(losslessNum.toString())
  }

  return Number(losslessNum.toString())
}
