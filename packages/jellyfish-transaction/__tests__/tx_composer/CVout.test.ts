import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { CVoutV2, CVoutV4, Vout, OP_CODES, OP_PUSHDATA } from '../../src'
import { expectHexBufferToObject, expectObjectToHexBuffer } from './index'

describe('CVoutV2', () => {
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
      tokenId: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVoutV4(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVoutV4(data))
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
      tokenId: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVoutV4(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVoutV4(data))
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
      tokenId: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVoutV4(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVoutV4(data))
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
      tokenId: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVoutV4(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVoutV4(data))
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
      tokenId: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVoutV4(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVoutV4(data))
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
      tokenId: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVoutV4(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVoutV4(data))
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
      tokenId: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CVoutV4(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVoutV4(data))
    })
  })
})

describe('CVoutV4', () => {
  describe('should out 1200000000 DFI (MAX SUPPLY)', () => {
    const hex = '00000c3d5d53aa011600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Vout = {
      value: new BigNumber('1200000000.00000000'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      },
      tokenId: 0
    }

    it('should compose from Buffer to Composable to Object', () => {
      const composable = new CVoutV2(SmartBuffer.fromBuffer(
        Buffer.from(hex, 'hex')
      ))
      expect(composable.value).toEqual(data.value)
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVoutV2(data))
    })
  })

  describe('should out 0.00000000 DFI', () => {
    const hex = '00000000000000001600141d0f172a0ecb48aee1be1f2687d2963ae33f71a1'
    const data: Vout = {
      value: new BigNumber('0'),
      script: {
        stack: [
          OP_CODES.OP_0,
          new OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
        ]
      },
      tokenId: 0x00
    }

    it('should compose from Buffer to Composable to Object', () => {
      const composable = new CVoutV2(SmartBuffer.fromBuffer(
        Buffer.from(hex, 'hex')
      ))
      expect(composable.value).toEqual(data.value)
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CVoutV2(data))
    })
  })
})
