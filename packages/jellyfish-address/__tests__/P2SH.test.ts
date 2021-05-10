import { SHA256 } from '@defichain/jellyfish-crypto'
import { MainNet, RegTest, TestNet } from '@defichain/jellyfish-network'
import base58 from 'bs58'
import { DeFiAddress } from '../src/index'

const fixture = {
  // mainnet: {
  //   p2pkh: 'dFFPENo7FPMJpDV6fUcfo4QfkZrfrV1Uf8',
  //   p2sh: '8JBuS81VT8ouPrT6YS55qoS74D13Cw7h1Y'
  // },

  testnet: {
    p2sh: 'trsUzSh3Qcu1MURY1BKDjttJN6hxtoRxM2', // 80
    p2pkh: '7LMorkhKTDjbES6DfRxX2RiNMbeemUkxmp' // 0f
  },

  randomP2sh: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
  
}

it('should be exported', () => {
  // const p2pkh = DeFiAddress.from(TestNet, fixture.testnet.p2pkh)
  // console.log(p2pkh.valid)
  // console.log('type', p2pkh.type)
  // console.log('network', p2pkh.network === TestNet)

  // const p2sh = DeFiAddress.from(TestNet, fixture.testnet.p2sh)
  // console.log(p2sh.valid)
  // console.log('type', p2sh.type)
  // console.log('network', p2sh.network === TestNet)

  // const p2sh = '17a914e9c3dd0c07aac76179ebc76a6c78d4d67c6c160a87' // p2sh
  // const raw = p2sh.substring(4, 44)
  // const prefix = '5a'

  const p2pkh = '1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac' // p2pkh
  const raw = p2pkh.substring(6, 46)
  const prefix = '12'

  // const encoded = base58.encode(Buffer.from('1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac', 'hex'))
  const prefixed = prefix + raw
  console.log('buffer length', Buffer.from(prefixed).length)
  const checkSum = SHA256(SHA256(Buffer.from(prefixed))).toString('hex').substr(0, 8)
  const full = prefixed + checkSum
  const encoded = base58.encode(Buffer.from(full, 'hex'))
  console.log('encoded', encoded)
})
