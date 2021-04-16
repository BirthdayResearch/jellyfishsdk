import { CWitnessScript, WitnessScript } from '../../src'
import { expectHexBufferToObject, expectObjectToHexBuffer } from './index.test'

describe('CWitnessScript', () => {
  describe('len is 71', () => {
    const hex = '47304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01'
    const data: WitnessScript = {
      hex: '304402203609e17b84f6a7d30c80bfa610b5b4542f32a8a0d5447a12fb1366d7f01cc44a0220573a954c4518331561406f90300e8f3358f51928d43c212a8caed02de67eebee01'
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitnessScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitnessScript(data))
    })
  })

  describe('len is 33', () => {
    const hex = '21025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    const data: WitnessScript = {
      hex: '025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357'
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitnessScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitnessScript(data))
    })
  })

  describe('len is 149', () => {
    const hex = '9552af4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e0148304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c0395960175'
    const data: WitnessScript = {
      hex: '52af4830450220487fb382c4974de3f7d834c1b617fe15860828c7f96454490edd6d891556dcc9022100baf95feb48f845d5bfc9882eb6aeefa1bc3790e39f59eaa46ff7f15ae626c53e0148304502205286f726690b2e9b0207f0345711e63fa7012045b9eb0f19c2458ce1db90cf43022100e89f17f86abc5b149eba4115d4f128bcf45d77fb3ecdd34f594091340c0395960175'
    }

    it('should compose from Buffer to Composable to Object', () => {
      expectHexBufferToObject(hex, data, buffer => new CWitnessScript(buffer))
    })

    it('should compose from Object to Composable to Buffer', () => {
      expectObjectToHexBuffer(data, hex, data => new CWitnessScript(data))
    })
  })
})
