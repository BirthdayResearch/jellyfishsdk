import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '../../src'

it('should generate 12-15-18-21-24 and validate', () => {
  function shouldGenerateAndValidate (length: 12 | 15 | 18 | 21 | 24): void {
    const words = generateMnemonic(length)

    expect(words.length).toStrictEqual(length)
    expect(validateMnemonic(words)).toStrictEqual(true)
    expect(mnemonicToSeed(words).length).toStrictEqual(64)
  }

  shouldGenerateAndValidate(12)
  shouldGenerateAndValidate(15)
  shouldGenerateAndValidate(18)
  shouldGenerateAndValidate(21)
  shouldGenerateAndValidate(24)
})

it('should generate 24 words as default', () => {
  const words = generateMnemonic()

  expect(words.length).toStrictEqual(24)
  expect(validateMnemonic(words)).toStrictEqual(true)
  expect(mnemonicToSeed(words).length).toStrictEqual(64)
})

it('should always generate a fixed mnemonic with the same rng', () => {
  const words = generateMnemonic(24, (numOfBytes) => {
    return Buffer.alloc(numOfBytes, 0)
  })

  expect(validateMnemonic(words)).toStrictEqual(true)
  expect(mnemonicToSeed(words).toString('hex')).toStrictEqual(
    '408b285c123836004f4b8842c89324c1f01382450c0d439af345ba7fc49acf705489c6fc77dbd4e3dc1dd8cc6bc9f043db8ada1e243c4a0eafb290d399480840'
  )
  expect(words.join(' ')).toStrictEqual(
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
  )
})

it('should validate a fixed mnemonic', () => {
  const fixtures = [
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon agent',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    'legal winner thank year wave sausage worth useful legal winner thank yellow',
    'letter advice cage absurd amount doctor acoustic avoid letter advice cage above',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
    'void come effort suffer camp survey warrior heavy shoot primary clutch crush open amazing screen patrol group space point ten exist slush involve unfold'
  ]

  for (const fixture of fixtures) {
    expect(validateMnemonic(fixture)).toStrictEqual(true)

    const words = fixture.split(' ')
    expect(validateMnemonic(words)).toStrictEqual(true)
  }
})
