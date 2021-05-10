import { Address, P2PKH, P2SH, P2WPKH, P2WSH } from '../../src/address_validator'
import { bech32 } from 'bech32'

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

  console.log('P2WSH: ', 
      Buffer.from(bech32.fromWords(bech32.decode(P2WSH.SAMPLE).words.slice(1))).toString('hex')
      // 1863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262
  )
  console.log('P2WPKH: ', 
    // bech32.fromWords(
      Buffer.from(bech32.fromWords(bech32.decode(P2WPKH.SAMPLE).words.slice(1))).toString('hex')
      // e8df018c7e326cc253faac7e46cdc51e68542c42
    // )
  )
})
