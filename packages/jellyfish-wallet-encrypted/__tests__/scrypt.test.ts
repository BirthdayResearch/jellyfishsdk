import { Scrypt } from '../src'

it('should be able to generate from random (same) passphrase into multiple desired length secret', async () => {
  const scryptsy = new Scrypt()
  const secret1 = await scryptsy.derive('random password', Buffer.from('abcd', 'hex'), 64)
  expect(secret1.length).toStrictEqual(64)

  const secret2 = await scryptsy.derive('random password', Buffer.from('abcd', 'hex'), 40)
  expect(secret2.length).toStrictEqual(40)
})

it('configurable params (easy-hard)', async () => {
  const easy = new Scrypt(
    16384,
    8,
    1
  )

  const hard = new Scrypt(
    16384,
    8,
    8
  )

  const easyStart = Date.now()
  await easy.derive('random password', Buffer.from('abcd', 'hex'), 32)
  const easyTime = Date.now() - easyStart

  const hardStart = Date.now()
  await hard.derive('random password', Buffer.from('abcd', 'hex'), 32)
  const hardTime = Date.now() - hardStart

  // significantly slower
  // technically it is 8x harder, but they can be processed in parallel
  expect(hardTime).toBeGreaterThan(easyTime * 2)
})
