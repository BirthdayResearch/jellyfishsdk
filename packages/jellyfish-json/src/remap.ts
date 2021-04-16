import BigNumber from 'bignumber.js'
import { LosslessNumber } from 'lossless-json'

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
  [path: string]: 'bignumber' | PrecisionPath
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
function deepRemap (losslessObj: any, precision: 'bignumber' | PrecisionPath): any {
  if (typeof precision !== 'object') {
    return reviveObjectAs(losslessObj, precision)
  }
  if (Array.isArray(losslessObj)) {
    return losslessObj.map(obj => deepRemap(obj, precision))
  }

  for (const [key, value] of Object.entries(losslessObj)) {
    losslessObj[key] = deepRemap(value, precision[key])
  }
  return reviveObjectAs(losslessObj)
}

/**
 * Array will deeply remapped, object keys will be iterated on.
 *
 * @param {any} losslessObj to revive
 * @param {'bignumber'} precision to use, specific 'bignumber' for BigNumber else always default to number
 */
function reviveObjectAs (losslessObj: any, precision?: 'bignumber' | string): any {
  if (Array.isArray(losslessObj)) {
    return losslessObj.map((v: any) => reviveObjectAs(v, precision))
  }

  if (losslessObj instanceof LosslessNumber) {
    return reviveLosslessAs(losslessObj, precision)
  }

  if (typeof losslessObj === 'object') {
    for (const [key, value] of Object.entries(losslessObj)) {
      losslessObj[key] = reviveObjectAs(value, precision)
    }
    return losslessObj
  }

  return losslessObj
}

/**
 * @param {LosslessNumber} losslessNum to revive as bignumber or number if precision != bignumber
 * @param {'bignumber'} precision to use, specific 'bignumber' for BigNumber else always default to number
 */
function reviveLosslessAs (losslessNum: LosslessNumber, precision?: 'bignumber' | string): BigNumber | number {
  if (precision === 'bignumber') {
    return new BigNumber(losslessNum.toString())
  }

  return Number(losslessNum.toString())
}
