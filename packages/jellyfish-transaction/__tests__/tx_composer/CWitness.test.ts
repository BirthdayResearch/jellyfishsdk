import { CWitness, Witness } from '../../src'
import { expectHexBufferToObject, expectObjectToHexBuffer } from './index'

describe('CWitness', () => {
  describe('0x02 0x47<> 0x27<>', () => {
    const hex = '024730440220032521802a76ad7bf74d0e2c218b72cf0cbc867066e2e53db905ba37f130397e02207709e2188ed7f08f4c952d9d13986da504502b8c3be59617e043552f506c46ff83275163ab68210392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98ac'
    const data: Witness = {
      scripts: [
        {
          hex: '30440220032521802a76ad7bf74d0e2c218b72cf0cbc867066e2e53db905ba37f130397e02207709e2188ed7f08f4c952d9d13986da504502b8c3be59617e043552f506c46ff83'
        },
        {
          hex: '5163ab68210392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98ac'
        }
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitness(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitness(data))
    })
  })

  describe('0x02 0x47<> 0x27<>', () => {
    const hex = '02483045022100f6a10b8604e6dc910194b79ccfc93e1bc0ec7c03453caaa8987f7d6c3413566002206216229ede9b4d6ec2d325be245c5b508ff0339bf1794078e20bfe0babc7ffe683270063ab68210392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98ac'
    const data: Witness = {
      scripts: [
        {
          hex: '3045022100f6a10b8604e6dc910194b79ccfc93e1bc0ec7c03453caaa8987f7d6c3413566002206216229ede9b4d6ec2d325be245c5b508ff0339bf1794078e20bfe0babc7ffe683'
        },
        {
          hex: '0063ab68210392972e2eb617b2388771abe27235fd5ac44af8e61693261550447a4c3e39da98ac'
        }
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitness(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitness(data))
    })
  })

  describe('0x07 0x00 0x48<> 0x48<> 0x01<02> 0x21<> 0x21<> 0x95<>', () => {
    const hex =
      '0700' +
      '4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e01' +
      '48304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c03959601' +
      '0102' +
      '2102966f109c54e85d3aee8321301136cedeb9fc710fdef58a9de8a73942f8e567c0' +
      '21034ffc99dd9a79dd3cb31e2ab3e0b09e0e67db41ac068c625cd1f491576016c84e' +
      '9552af4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e0148304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c0395960175'
    const data: Witness = {
      scripts: [
        {
          hex: ''
        },
        {
          hex: '30450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e01'
        },
        {
          hex: '304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c03959601'
        },
        {
          hex: '02'
        },
        {
          hex: '02966f109c54e85d3aee8321301136cedeb9fc710fdef58a9de8a73942f8e567c0'
        },
        {
          hex: '034ffc99dd9a79dd3cb31e2ab3e0b09e0e67db41ac068c625cd1f491576016c84e'
        },
        {
          hex: '52af4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e0148304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c0395960175'
        }
      ]
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitness(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitness(data))
    })
  })
})
