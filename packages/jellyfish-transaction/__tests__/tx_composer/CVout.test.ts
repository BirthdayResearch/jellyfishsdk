import BigNumber from 'bignumber.js'
import { CVout, Vout } from '../../src'
import { OP_CODES, OP_PUSHDATA } from '../../src/script'
import { expectHexBufferToObject, expectObjectToHexBuffer } from './index'

describe('CVout', () => {
  // 1000 00000000
  // 1000|00000000
  // 1000 DFI BigNumber will automatically be mapped into 8 bytes unsigned.

  describe('should out 1200000000 DFI (MAX SUPPLY)', () => {
    const hex = '00000c3d5d53aa011600141d0f172a0ecb48aee1be1f2687d2963ae33f71a100'
    const data: Vout = {
      value: new BigNumber('1200000000.00000000'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      },
      dct_id: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 123456789.01234567 DFI (2bdc545d6b4b87 in BE)', () => {
    const hex = '874b6b5d54dc2b001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a100'
    const data: Vout = {
      value: new BigNumber('123456789.01234567'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      },
      dct_id: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 1000000 DFI', () => {
    const hex = '00407a10f35a00001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a100'
    const data: Vout = {
      value: new BigNumber('1000000'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      },
      dct_id: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 1000 DFI', () => {
    const hex = '00e87648170000001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a100'
    const data: Vout = {
      value: new BigNumber('1000'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      },
      dct_id: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 0.00002000 DFI', () => {
    const hex = 'd0070000000000001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a100'
    const data: Vout = {
      value: new BigNumber('0.00002'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      },
      dct_id: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 0.00000001 DFI', () => {
    const hex = '01000000000000001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a100'
    const data: Vout = {
      value: new BigNumber('0.00000001'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      },
      dct_id: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })

  describe('should out 0.00000000 DFI', () => {
    const hex = '00000000000000001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a100'
    const data: Vout = {
      value: new BigNumber('0'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      },
      dct_id: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVout(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVout(data))
    })
  })
})
