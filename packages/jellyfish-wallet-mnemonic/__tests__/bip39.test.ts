import {
  entropyAsMnemonic,
  generateMnemonicWords,
  mnemonicAsEntropy,
  mnemonicToSeed,
  validateMnemonicSentence,
  validateMnemonicWord
} from '../src'

it('should generate 12-15-18-21-24 and validate', () => {
  function shouldGenerateAndValidate (length: 12 | 15 | 18 | 21 | 24): void {
    const words = generateMnemonicWords(length)

    expect(words.length).toStrictEqual(length)
    expect(validateMnemonicSentence(words)).toStrictEqual(true)
    expect(mnemonicToSeed(words).length).toStrictEqual(64)
  }

  shouldGenerateAndValidate(12)
  shouldGenerateAndValidate(15)
  shouldGenerateAndValidate(18)
  shouldGenerateAndValidate(21)
  shouldGenerateAndValidate(24)
})

it('should generate 24 words as default', () => {
  const words = generateMnemonicWords()

  expect(words.length).toStrictEqual(24)
  expect(validateMnemonicSentence(words)).toStrictEqual(true)
  expect(mnemonicToSeed(words).length).toStrictEqual(64)
})

it('should always generate a fixed mnemonic with the same rng', () => {
  const words = generateMnemonicWords(24, (numOfBytes) => {
    return Buffer.alloc(numOfBytes, 0)
  })

  expect(validateMnemonicSentence(words)).toStrictEqual(true)
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
    expect(validateMnemonicSentence(fixture)).toStrictEqual(true)

    const words = fixture.split(' ')
    expect(validateMnemonicSentence(words)).toStrictEqual(true)
  }
})

describe('single word mnemonic validation', () => {
  it('should be valid', () => {
    expect(validateMnemonicWord('abandon')).toStrictEqual(true)
    expect(validateMnemonicWord('art')).toStrictEqual(true)
    expect(validateMnemonicWord('ability')).toStrictEqual(true)
    expect(validateMnemonicWord('bullet')).toStrictEqual(true)
    expect(validateMnemonicWord('diet')).toStrictEqual(true)
    expect(validateMnemonicWord('grace')).toStrictEqual(true)
    expect(validateMnemonicWord('mechanic')).toStrictEqual(true)
  })

  it('should be invalid', () => {
    expect(validateMnemonicWord('should')).toStrictEqual(false)
    expect(validateMnemonicWord('be')).toStrictEqual(false)
    expect(validateMnemonicWord('invalid')).toStrictEqual(false)
    expect(validateMnemonicWord('english')).toStrictEqual(false)
    expect(validateMnemonicWord('1')).toStrictEqual(false)
    expect(validateMnemonicWord('好')).toStrictEqual(false)
    expect(validateMnemonicWord('的')).toStrictEqual(false)
    expect(validateMnemonicWord('一')).toStrictEqual(false)
    expect(validateMnemonicWord('あつい')).toStrictEqual(false)
    expect(validateMnemonicWord('가격')).toStrictEqual(false)
  })
})

describe('mnemonicAsEntropy and entropyAsMnemonic', () => {
  it('should mnemonicAsEntropy == entropyAsMnemonic', () => {
    const generated = generateMnemonicWords()

    const entropy = mnemonicAsEntropy(generated)
    const words = entropyAsMnemonic(entropy)

    expect(entropy.length).toStrictEqual(32)
    expect(generated).toStrictEqual(words)

    expect(generated.length).toStrictEqual(24)
    expect(generated[0]).toStrictEqual(words[0])
    expect(generated[23]).toStrictEqual(words[23])
  })

  it('should get 0000 for abandon x23 + art cs', () => {
    const buffer = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')

    const words = generateMnemonicWords(24, () => buffer)

    const entropy = mnemonicAsEntropy(words)
    expect(entropy).toStrictEqual(buffer)
  })

  it('should get abandon x23 + art cs for 0000', () => {
    const buffer = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')
    const words = entropyAsMnemonic(buffer)
    expect(words.join(' ')).toStrictEqual(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
    )
  })

  it('should fail if not 32 byte long', () => {
    const buffer31 = Buffer.from('00000000000000000000000000000000000000000000000000000000000000', 'hex')

    expect(() => {
      entropyAsMnemonic(buffer31)
    }).toThrow('expected entropy to be 32 byte long')
  })
})
