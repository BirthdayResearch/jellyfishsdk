import { SmartBuffer } from 'smart-buffer'
import { CTransaction, CTransactionSegWit } from '../../../src'

const unsigned = '0200000001e28bf7657f36b80bcfc7854a25ff0b2e0adbaffb95870b8387a637fd1e26d0970000000000ffffffff02804a5d05000000001600144ab4391ce5a732e36139e72d79a28e01b7b080348085b50d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a8200000000'
const signed = '02000000000101e28bf7657f36b80bcfc7854a25ff0b2e0adbaffb95870b8387a637fd1e26d0970000000000ffffffff02804a5d05000000001600144ab4391ce5a732e36139e72d79a28e01b7b080348085b50d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a820247304402203649fd61d1dd402969bdc8c74c704ab7ea3951916744901b764809f208da0c7b022030db92126984acda41dc8379c100e4e997e6f6face2b16b486037dd8cc662c31012103c1f7238aa1d97af163018b76afc000f378698da9537cf6ad7dc902643a3dd5d100000000'

it('bi-directional unsigned buffer', () => {
  const fromBuffer = SmartBuffer.fromBuffer(Buffer.from(unsigned, 'hex'))
  const tx = new CTransaction(fromBuffer)

  const toBuffer = new SmartBuffer()
  tx.toBuffer(toBuffer)
  expect(toBuffer.toBuffer().toString('hex')).toStrictEqual(unsigned)
})

it('bi-directional signed buffer', () => {
  const fromBuffer = SmartBuffer.fromBuffer(Buffer.from(signed, 'hex'))
  const tx = new CTransactionSegWit(fromBuffer)

  const toBuffer = new SmartBuffer()
  tx.toBuffer(toBuffer)

  expect(toBuffer.toBuffer().toString('hex')).toStrictEqual(signed)
})
