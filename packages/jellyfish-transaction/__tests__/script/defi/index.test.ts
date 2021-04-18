import { SmartBuffer } from 'smart-buffer'
import { OP_CODES, toBuffer, toOPCodes } from "../../../src/script";

describe('[OP_RETURN, ]', () => {
  const hex = '6a43446654784217a91463249b89f10c1282faf2e8caf6d49dfff8aad4b0870117a914990b4f2d928f6dfb98c812b485c54dc73434ac248701030000000200000000000000'

  it('should map fromBuffer', () => {
    const codes = toOPCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))

    console.log(codes)

    expect(codes[0].type).toBe('OP_RETURN')
    expect(codes.length).toBe(2)
  })

  it('should map toBuffer', () => {
    const buffer = toBuffer([
      OP_CODES.OP_RETURN,
      OP_CODES.OP_PUSHDATA(
        Buffer.from('aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9', 'hex'), 'little'
      )
    ])
    expect(buffer.toString('hex')).toBe(hex)
  })
})
