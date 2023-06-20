import { dSHA256, HASH160, KECCAK256, SHA256 } from '../src'

it('should sha256 with SHA256', () => {
  const buffer = Buffer.from('56210307b8ae49ac90a048e9b53357a2354b3334e9c8bee813ecb98e99a7e07e8c3ba32103b28f0c28bfab54554ae8c658ac5c3e0ce6e79ad336331f78c428dd43eea8449b21034b8113d703413d57761b8b9781957b8c0ac1dfe69f492580ca4195f50376ba4a21033400f6afecb833092a9a21cfdf1ed1376e58c5d1f47de74683123987e967a8f42103a6d48b1131e94ba04d9737d61acdaa1322008af9602b3b14862c07a1789aac162102d8b661b0b3302ee2f162b09e07a55ad5dfbe673a9f01d9f0c19617681024306b56ae', 'hex')
  const hashed = SHA256(buffer)
  expect(hashed.toString('hex')).toStrictEqual('a16b5755f7f6f96dbd65f5f0d6ab9418b89af4b1f14a1bb8a09062c35f0dcb54')
})

it('should sha256(rmd160) with HASH160', () => {
  const buffer = Buffer.from('025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee6357', 'hex')
  const hashed = HASH160(buffer)
  expect(hashed.toString('hex')).toStrictEqual('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1')
})

it('should double sha256 with dSHA256', () => {
  const buffer = Buffer.from('eeffffffffffffff', 'hex')
  const hashed = dSHA256(buffer)
  expect(hashed.toString('hex')).toStrictEqual('52b0a642eea2fb7ae638c36f6252b6750293dbe574a806984b8e4d8548339a3b')
})

it('should keccak256 with KECCAK256', () => {
  const buffer = Buffer.from('1286647f7440111ab928bdea4daa42533639c4567d81eca0fff622fb6438eae31cee4e0c53581dacc579fde09f5a25150703e9efd8d2c5ecbbda619d4ca104e6', 'hex')
  const hashed = KECCAK256(buffer)
  expect(hashed.toString('hex')).toStrictEqual('8bf885ce24b542db49bade8e9b8a4af42140d8a4c153a822f02571a1dd037e89')
})
