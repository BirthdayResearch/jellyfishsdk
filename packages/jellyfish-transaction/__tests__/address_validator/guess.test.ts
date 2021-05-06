import { Address, P2PKH, P2SH, P2WPKH, P2WSH } from '../../src/address_validator'

it('should be able to guess address type', () => {
  const samples = [
    P2SH.SAMPLE,
    P2PKH.SAMPLE,
    P2WSH.SAMPLE,
    P2WPKH.SAMPLE
  ]

  samples.forEach(sampleAddress => {
    const result = Address.guess(sampleAddress)
    console.log(result.type, ': ', sampleAddress, ', is valid: ', result.valid)
    console.log('Return type: ', result.constructor)
  })
})
