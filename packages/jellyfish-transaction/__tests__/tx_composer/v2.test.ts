import { SmartBuffer } from 'smart-buffer'
import { CTransactionSegWit } from '../../src'

const v2 = '020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff050393700500ffffffff038260498a040000001976a9143db7aeb218455b697e94f6ff00c548e72221231d88ac7e67ce1d0000000017a914dd7730517e0e4969b4e43677ff5bee682e53420a870000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90120000000000000000000000000000000000000000000000000000000000000000000000000'

it('should parse v2 txn with 3 vout', () => {
  const buffer = SmartBuffer.fromBuffer(Buffer.from(v2, 'hex'))
  const composable = new CTransactionSegWit(buffer)

  expect(composable.toObject().vout.length).toBe(3)
})

it('should bi-directional buffer to object to buffer', () => {
  const fromBuffer = SmartBuffer.fromBuffer(Buffer.from(v2, 'hex'))
  const composable = new CTransactionSegWit(fromBuffer)

  const object = composable.toObject()

  const txn = new CTransactionSegWit(object)
  const toBuffer = new SmartBuffer()
  txn.toBuffer(toBuffer)

  expect(toBuffer.toBuffer().toString('hex')).toBe(v2)
})
