import { Bech32, Elliptic, WIF } from '../src'

describe('keySet 1', () => {
  const keySet = {
    bech32: 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn',
    wif: 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
  }

  it('should convert from WIF to priv to pub to bech32', async () => {
    const wifDecoded = WIF.decode(keySet.wif)
    const privKey = wifDecoded.privateKey
    const pubKey = await Elliptic.fromPrivKey(privKey).publicKey()
    expect(Bech32.fromPubKey(pubKey, 'bcrt')).toStrictEqual(keySet.bech32)
  })
})

describe('keySet 2', () => {
  const keySet = {
    bech32: 'bcrt1qf26rj8895uewxcfeuukhng5wqxmmpqp555z5a7',
    wif: 'cQbfHFbdJNhg3UGaBczir2m5D4hiFRVRKgoU8GJoxmu2gEhzqHtV'
  }

  it('should convert from WIF to priv to pub to bech32', async () => {
    const wifDecoded = WIF.decode(keySet.wif)
    const privKey = wifDecoded.privateKey
    const pubKey = await Elliptic.fromPrivKey(privKey).publicKey()
    expect(Bech32.fromPubKey(pubKey, 'bcrt')).toStrictEqual(keySet.bech32)
  })
})
