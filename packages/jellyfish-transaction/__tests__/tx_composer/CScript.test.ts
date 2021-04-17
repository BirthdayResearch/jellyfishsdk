import { CScript, Script } from '../../src'
import { OP_CODES, OP_PUSHDATA } from '../../src/script'
import { expectHexBufferToObject, expectObjectToHexBuffer } from './index'

describe('CScript', () => {
  describe('P2PK', () => {
    const hex = '2321036d5c20fa14fb2f635474c1dc4ef5909d4568e5569b79fc94d3448486e14685f8ac'
    const data: Script = {
      stack: [
        new OP_PUSHDATA(Buffer.from('036d5c20fa14fb2f635474c1dc4ef5909d4568e5569b79fc94d3448486e14685f8', 'hex'), 'little'),
        OP_CODES.OP_CHECKSIG
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2PKH 1', () => {
    const hex = '1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac'
    const data: Script = {
      stack: [
        OP_CODES.OP_DUP,
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(Buffer.from('3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159', 'hex'), 'little'),
        OP_CODES.OP_EQUALVERIFY,
        OP_CODES.OP_CHECKSIG
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2PKH 2', () => {
    const hex = '1976a914a30741f8145e5acadf23f751864167f32e0963f788ac'
    const data: Script = {
      stack: [
        OP_CODES.OP_DUP,
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(Buffer.from('a30741f8145e5acadf23f751864167f32e0963f7', 'hex'), 'little'),
        OP_CODES.OP_EQUALVERIFY,
        OP_CODES.OP_CHECKSIG
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2SH', () => {
    const hex = '17a9144733f37cf4db86fbc2efed2500b4f4e49f31202387'
    const data: Script = {
      stack: [
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(Buffer.from('4733f37cf4db86fbc2efed2500b4f4e49f312023', 'hex'), 'little'),
        OP_CODES.OP_EQUAL
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2WPKH', () => {
    const hex = '1600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Script = {
      stack: [
        OP_CODES.OP_0,
        new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })

  describe('P2WSH', () => {
    const hex = '2200205d1b56b63d714eebe542309525f484b7e9d6f686b3781b6f61ef925d66d6f6a0'
    const data: Script = {
      stack: [
        OP_CODES.OP_0,
        new OP_PUSHDATA(Buffer.from('5d1b56b63d714eebe542309525f484b7e9d6f686b3781b6f61ef925d66d6f6a0', 'hex'), 'little')
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CScript(data))
    })
  })
})
