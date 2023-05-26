import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'

export const ONE_HUNDRED_MILLION = new BigNumber('100000000')
export const MAX_INT64 = new BigNumber('9223372036854775807')

/**
 * @param {SmartBuffer} buffer to read as unsigned BigNumber (LE)
 * @return BigNumber
 */
export function readBigNumberUInt64 (buffer: SmartBuffer): BigNumber {
  const second = buffer.readUInt32LE()
  const first = buffer.readUInt32LE()
  return new BigNumber(first).multipliedBy(0x100000000).plus(second)
}

/**
 * @param {BigNumber} bigNumber
 * @param {SmartBuffer} buffer to write to as unsigned BigNumber (LE)
 */
export function writeBigNumberUInt64 (bigNumber: BigNumber, buffer: SmartBuffer): void {
  if (bigNumber.isGreaterThan(new BigNumber('18446744073709551615'))) {
    throw new Error(`It must be >= 0n and < 2n ** 64n. Received ${bigNumber.toString(10)}`)
  }
  const second = bigNumber.mod(0x100000000)
  const first = bigNumber.minus(second).dividedBy(0x100000000)
  buffer.writeUInt32LE(second.toNumber())
  buffer.writeUInt32LE(first.toNumber())
}
