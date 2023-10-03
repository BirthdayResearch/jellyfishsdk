import { OP_CODES, Script } from '@defichain/jellyfish-transaction'
import { Eth } from '../src'

const keypair = {
  evmAddr: '0x0a06de8abc3f15359ec0dfe32394c8b8f09e828f',
  checksumEvmAddr: '0x0a06DE8AbC3f15359EC0dfe32394C8B8f09e828F',
  pubKeyUncompressed: '04e60942751bc776912cdc8cf11aa3ce33ce3ef6882ff93a9fafa0b968e6b926293a6913f9efae6362ce8ffd0b8a4ae45c3a6ccafacbab2192991125277d6710db'
}

it('should convert evm address to script', () => {
  const evmScript = Eth.fromAddress(keypair.evmAddr)
  expect(evmScript).toStrictEqual({
    stack: [
      OP_CODES.OP_16,
      OP_CODES.OP_PUSHDATA_HEX_BE(keypair.evmAddr.substring(2))
    ]
  })
})

it('should return undefined script for invalid eth address', () => {
  const evmScript = Eth.fromAddress('0xabc123')
  expect(evmScript).toStrictEqual(undefined)
})

it('should convert evm script to address', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_16,
      OP_CODES.OP_PUSHDATA_HEX_BE(keypair.evmAddr.substring(2))
    ]
  }
  const evmAddress = Eth.fromScript(script)
  expect(evmAddress).toStrictEqual(keypair.evmAddr.substring(2))
})

it('should return undefined address for invalid evm script', () => {
  const script: Script = {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA_HEX_BE(keypair.evmAddr.substring(2))
    ]
  }
  const evmAddress = Eth.fromScript(script)
  expect(evmAddress).toStrictEqual(undefined)
})
