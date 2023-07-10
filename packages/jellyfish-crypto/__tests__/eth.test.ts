import { Eth } from '../src'

const keypair = {
  evmAddr: '0x0a06de8abc3f15359ec0dfe32394c8b8f09e828f',
  checksumEvmAddr: '0x0a06DE8AbC3f15359EC0dfe32394C8B8f09e828F',
  pubKeyUncompressed: '04e60942751bc776912cdc8cf11aa3ce33ce3ef6882ff93a9fafa0b968e6b926293a6913f9efae6362ce8ffd0b8a4ae45c3a6ccafacbab2192991125277d6710db'
}

it('should reject invalid length uncompressed public key', () => {
  expect(() => {
    // @ts-expect_error
    Eth.fromPubKeyUncompressed(Buffer.from(keypair.pubKeyUncompressed, 'hex').subarray(1))
  }).toThrow('InvalidUncompressedPubKeyLength')
})

it('should convert evm address to checksum address', () => {
  const pubKeyUncompressed = Buffer.from(keypair.pubKeyUncompressed, 'hex')
  const checksumEvmAddr = Eth.fromPubKeyUncompressed(pubKeyUncompressed)
  expect(checksumEvmAddr).toStrictEqual(keypair.checksumEvmAddr)
})
