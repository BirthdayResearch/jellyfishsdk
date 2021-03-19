import { Main, RegTest, Test } from "../src";

it('should match Main network', () => {
  expect(Main.messagePrefix).toBe('\x15Defi Signed Message:\n')
  expect(Main.bech32).toBe('df')
  expect(Main.bip32.public).toBe(0x0488b21e)
  expect(Main.bip32.private).toBe(0x0488ade4)
  expect(Main.pubKeyHash).toBe(0x12)
  expect(Main.scriptHash).toBe(0x5a)
  expect(Main.wif).toBe(0x80)
})

it('should match Test network', () => {
  expect(Test.messagePrefix).toBe('\x15Defi Signed Message:\n')
  expect(Test.bech32).toBe('tf')
  expect(Test.bip32.public).toBe(0x043587cf)
  expect(Test.bip32.private).toBe(0x04358394)
  expect(Test.pubKeyHash).toBe(0xf)
  expect(Test.scriptHash).toBe(0x80)
  expect(Test.wif).toBe(0xef)
})

it('should match RegTest network', () => {
  expect(RegTest.messagePrefix).toBe('\x15Defi Signed Message:\n')
  expect(RegTest.bech32).toBe('bcrt')
  expect(RegTest.bip32.public).toBe(0x043587cf)
  expect(RegTest.bip32.private).toBe(0x04358394)
  expect(RegTest.pubKeyHash).toBe(0x6f)
  expect(RegTest.scriptHash).toBe(0xc4)
  expect(RegTest.wif).toBe(0xef)
})
