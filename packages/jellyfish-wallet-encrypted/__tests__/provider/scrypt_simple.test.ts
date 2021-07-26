import { SimpleScryptsy } from '../../src'

describe('passphraseToKey()', () => {
  it('Should be able to generate from random (same) passphrase into multiple desired length secret', async () => {
    const scryptsy = new SimpleScryptsy()
    const secret1 = await scryptsy.passphraseToKey('random password', Buffer.from('abcd', 'hex'), 64)
    expect(secret1.length).toStrictEqual(64)

    const secret2 = await scryptsy.passphraseToKey('random password', Buffer.from('abcd', 'hex'), 40)
    expect(secret2.length).toStrictEqual(40)
  })

  it('Configurable params (difficulty)', async () => {
    const easy = new SimpleScryptsy({
      N: 16384, // 2 ^ 14
      r: 8,
      p: 1
    })

    const hard = new SimpleScryptsy({
      N: 16384, // 2 ^ 14
      r: 8,
      p: 8
    })

    const easyStart = Date.now()
    await easy.passphraseToKey('random password', Buffer.from('abcd', 'hex'), 32)
    const easyTime = Date.now() - easyStart

    const hardStart = Date.now()
    await hard.passphraseToKey('random password', Buffer.from('abcd', 'hex'), 32)
    const hardTime = Date.now() - hardStart

    // significantly slower
    // technically it is 8x harder, but they can be processed in parallel
    expect(hardTime).toBeGreaterThan(easyTime * 2)
  })
})
