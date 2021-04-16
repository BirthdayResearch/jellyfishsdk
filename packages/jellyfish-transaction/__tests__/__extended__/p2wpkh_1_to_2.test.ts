// From Address P2WPKH
const input = {
  bech32: 'bcrt1qykj5fsrne09yazx4n72ue4fwtpx8u65zac9zhn',
  privKey: 'cQSsfYvYkK5tx3u1ByK2ywTTc9xJrREc1dd67ZrJqJUEMwgktPWN'
}
// To Address P2WPKH
const output = {
  bech32: 'bcrt1qf26rj8895uewxcfeuukhng5wqxmmpqp555z5a7',
  privKey: 'cQbfHFbdJNhg3UGaBczir2m5D4hiFRVRKgoU8GJoxmu2gEhzqHtV'
}
const unsigned =  '040000000193c90783761bf94838ced5a8313eb355c3bdd053cdbdbb3f9e0f3dbc3243609b0000000000ffffffff020065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340080ce341d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a820000000000'
const signed = '0400000000010193c90783761bf94838ced5a8313eb355c3bdd053cdbdbb3f9e0f3dbc3243609b0000000000ffffffff020065cd1d000000001600144ab4391ce5a732e36139e72d79a28e01b7b080340080ce341d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a82000247304402201142c461b7b52323654710b14074928dd8e623d75141f9eb8c2132b7cb2d47c202202883fde993e1ecf0cf3955235522e9fe948b523b568d0e6b427f83c6f1b3efd9012103987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe8100000000'

describe('decode unsigned transaction', () => {
  Buffer.from(unsigned, 'hex')
})

describe('decode signed transaction', () => {
  Buffer.from(signed, 'hex')
})

describe('sign transaction', () => {

})
