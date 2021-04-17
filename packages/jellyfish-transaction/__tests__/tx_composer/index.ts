import { SmartBuffer } from 'smart-buffer'
import { ComposableBuffer } from '../../src/buffer/buffer_composer'

export function expectHexBufferToObject<T> (hex: string, data: T, asC: ((buffer: SmartBuffer) => ComposableBuffer<T>)): void {
  const composable = asC(SmartBuffer.fromBuffer(
    Buffer.from(hex, 'hex')
  ))

  expect(composable.toObject()).toEqual(data)
  // parse and stringify due to JSON path inconsistent positioning
  expect(JSON.parse(JSON.stringify(composable.toObject()))).toEqual(
    JSON.parse(JSON.stringify(data))
  )
}

export function expectObjectToHexBuffer<T> (data: T, hex: string, asC: ((data: T) => ComposableBuffer<T>)): void {
  const txn = asC(data)

  const buffer = new SmartBuffer()
  txn.toBuffer(buffer)

  expect(buffer.toBuffer().toString('hex')).toBe(hex)
  // parse and stringify due to JSON path inconsistent positioning
  expect(JSON.parse(JSON.stringify(txn.toObject()))).toEqual(
    JSON.parse(JSON.stringify(data))
  )
}
