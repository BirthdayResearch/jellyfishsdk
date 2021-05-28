import { RegTest } from '@defichain/jellyfish-network'
import { Script } from '@defichain/jellyfish-transaction'
import { Address } from '../src'

class DummyAddress extends Address {
  getScript (): Script {
    return {
      stack: []
    }
  }
}

describe('constructor()', () => {
  let validAddress: Address
  beforeAll(() => {
    validAddress = new DummyAddress(RegTest, 'any', Buffer.from('0x1234', 'hex'), true, 'Unknown')
    expect(validAddress.valid).toBeTruthy()
  })

  it('should not be able to instantiate `valid` address - without network', () => {
    expect(() => {
      // eslint-disable-next-line no-new
      new DummyAddress(undefined, validAddress.utf8String, validAddress.getBuffer(), true, 'Unknown')
    }).toThrow('InvalidDefiAddress')
  })

  it('should not be able to instantiate `valid` address - without buffer (data)', () => {
    expect(() => {
      // eslint-disable-next-line no-new
      new DummyAddress(validAddress.getNetwork(), validAddress.utf8String, undefined, true, 'Unknown')
    }).toThrow('InvalidDefiAddress')
  })
})

it('getNetwork()', () => {
  const validAddress = new DummyAddress(RegTest, 'any', Buffer.from('1234', 'hex'), true, 'Unknown')
  expect(validAddress.valid).toBeTruthy()
  expect(validAddress.getNetwork()).toStrictEqual(RegTest)

  const invalidAddress = new DummyAddress(RegTest, 'any', Buffer.from('1234', 'hex'), false, 'Unknown')
  expect(invalidAddress.valid).toBeFalsy()
  expect(() => {
    invalidAddress.getNetwork()
  }).toThrow('InvalidDefiAddress')
})

it('getBuffer()', () => {
  const validAddress = new DummyAddress(RegTest, 'any', Buffer.from('1234', 'hex'), true, 'Unknown')
  expect(validAddress.valid).toBeTruthy()
  expect(validAddress.getBuffer().toString('hex')).toStrictEqual('1234')

  const invalidAddress = new DummyAddress(RegTest, 'any', Buffer.from('1234', 'hex'), false, 'Unknown')
  expect(invalidAddress.valid).toBeFalsy()
  expect(() => {
    invalidAddress.getBuffer()
  }).toThrow('InvalidDefiAddress')
})
