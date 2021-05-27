import { Script } from '@defichain/jellyfish-transaction'
import { RegTest } from '@defichain/jellyfish-network'
import { Address, Validator } from '../src'

class DummyAddress extends Address {
  getScript (): Script {
    return {
      stack: []
    }
  }

  validators (): Validator[] {
    return [
      () => true,
      () => false
    ]
  }
}

describe('Address', () => {
  it('validate()', () => {
    const test = new DummyAddress(RegTest, 'address utf8', true, 'Unknown')

    expect(test.valid).toBeTruthy()
    expect(test.validatorPassed).toStrictEqual(0)

    test.validate()

    expect(test.valid).toBeFalsy()
    expect(test.validatorPassed).toStrictEqual(1)
  })
})
