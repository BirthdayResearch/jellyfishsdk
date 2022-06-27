import { SmartBuffer } from 'smart-buffer'
import { readVarInt, writeVarInt } from '../src/VarInt'

function expectVarInt (n: number, hex: string): void {
  const fromBuffer = new SmartBuffer()
  writeVarInt(n, fromBuffer)
  expect(fromBuffer.toString('hex')).toStrictEqual(hex)

  const toBuffer = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
  expect(readVarInt(toBuffer)).toStrictEqual(n)
}

describe('TEST VECTOR from CPP: variable-length integers: comments examples', () => {
  it('should writeVarInt as [0x00] when n is 0', function () {
    expectVarInt(0, '00')
  })

  it('should writeVarInt as [0x01] when n is 1', function () {
    expectVarInt(1, '01')
  })

  it('should writeVarInt as [0x7F] when n is 127', function () {
    expectVarInt(127, '7f')
  })

  it('should writeVarInt as [0x80 0x00] when n is 128', function () {
    expectVarInt(127, '7f')
  })

  it('should writeVarInt as [0x80 0x7F] when n is 255', function () {
    expectVarInt(255, '807f')
  })

  it('should writeVarInt as [0x81 0x00] when n is 256', function () {
    expectVarInt(256, '8100')
  })

  it('should writeVarInt as [0xFE 0x7F] when n is 16383', function () {
    expectVarInt(16383, 'fe7f')
  })

  it('should writeVarInt as [0xFF 0x00] when n is 16384', function () {
    expectVarInt(16384, 'ff00')
  })

  it('should writeVarInt as [0xFF 0x7F] when n is 16511', function () {
    expectVarInt(16511, 'ff7f')
  })

  it('should writeVarInt as [0x82 0xFE 0x7F] when n is 65535', function () {
    expectVarInt(65535, '82fe7f')
  })

  it('should writeVarInt as [0x8E 0xFE 0xFE 0xFF 0x00] when n is 2^32', function () {
    expectVarInt(4294967296, '8efefeff00')
  })
})

describe('TEST VECTOR from CPP: BOOST_AUTO_TEST_CASE(varints)', () => {
  it('should encode and decode from 0 to 100000', function () {
    for (let i = 0; i < 100000; i++) {
      const buffer = new SmartBuffer()
      writeVarInt(i, buffer)
      const n = readVarInt(buffer)

      expect(n).toStrictEqual(i)
    }
  })

  it('should encode and decode from 0 to Number.MAX_SAFE_INTEGER i*=10', function () {
    for (let i = 10; i < Number.MAX_SAFE_INTEGER; i *= 10) {
      const buffer = new SmartBuffer()
      writeVarInt(i, buffer)
      const n = readVarInt(buffer)

      expect(n).toStrictEqual(i)
    }
  })
})

describe('TEST VECTOR from CPP: BOOST_AUTO_TEST_CASE(varints_bitpatterns)', () => {
  it('VARINT(0, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "00"); ss.clear();', function () {
    expectVarInt(0, '00')
  })

  it('VARINT(0x7f, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "7f"); ss.clear();', function () {
    expectVarInt(0x7f, '7f')
  })

  // it('VARINT((int8_t)0x7f, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "7f"); ss.clear();', function () {
  //   expectVarInt((int8_t)0x7f, VarIntMode::NONNEGATIVE_SIGNED, '7f')
  // })

  it('VARINT(0x80, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "8000"); ss.clear();', function () {
    expectVarInt(0x80, '8000')
  })

  // it('VARINT((uint8_t)0x80); BOOST_CHECK_EQUAL(HexStr(ss), "8000"); ss.clear();', function () {
  //   expectVarInt((uint8_t)0x80, '8000')
  // })

  it('VARINT(0x1234, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "a334"); ss.clear();', function () {
    expectVarInt(0x1234, 'a334')
  })

  // it('VARINT((int16_t)0x1234, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "a334"); ss.clear();', function () {
  //   expectVarInt((int16_t)0x1234, VarIntMode::NONNEGATIVE_SIGNED, 'a334')
  // })

  it('VARINT(0xffff, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "82fe7f"); ss.clear();', function () {
    expectVarInt(0xffff, '82fe7f')
  })

  // it('VARINT((uint16_t)0xffff); BOOST_CHECK_EQUAL(HexStr(ss), "82fe7f"); ss.clear();', function () {
  //   expectVarInt((uint16_t)0xffff, '82fe7f')
  // })

  it('VARINT(0x123456, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "c7e756"); ss.clear();', function () {
    expectVarInt(0x123456, 'c7e756')
  })

  // it('VARINT((int32_t)0x123456, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "c7e756"); ss.clear();', function () {
  //   expectVarInt((int32_t)0x123456, VarIntMode::NONNEGATIVE_SIGNED, 'c7e756')
  // })

  it('VARINT(0x80123456U); BOOST_CHECK_EQUAL(HexStr(ss), "86ffc7e756"); ss.clear();', function () {
    expectVarInt(0x80123456, '86ffc7e756')
  })

  // it('VARINT((uint32_t)0x80123456U); BOOST_CHECK_EQUAL(HexStr(ss), "86ffc7e756"); ss.clear();', function () {
  //   expectVarInt((uint32_t)0x80123456U, '86ffc7e756')
  // })

  it('VARINT(0xffffffff); BOOST_CHECK_EQUAL(HexStr(ss), "8efefefe7f"); ss.clear();', function () {
    expectVarInt(0xffffffff, '8efefefe7f')
  })

  // it('VARINT(0x7fffffffffffffffLL, VarIntMode::NONNEGATIVE_SIGNED); BOOST_CHECK_EQUAL(HexStr(ss), "fefefefefefefefe7f"); ss.clear();', function () {
  //   expectVarInt(0x7fffffffffffffffLL, VarIntMode::NONNEGATIVE_SIGNED, 'fefefefefefefefe7f')
  // })

  // it('VARINT(0xffffffffffffffffULL); BOOST_CHECK_EQUAL(HexStr(ss), "80fefefefefefefefe7f"); ss.clear();', function () {
  //   expectVarInt(0xffffffffffffffffULL, '80fefefefefefefefe7f')
  // })
})
