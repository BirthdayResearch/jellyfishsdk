import { BIP32Path } from "../src/bip32_path";

describe('fromPathArray()', function () {
  it('should work with proper input', function () {
    const bipPath = BIP32Path.fromPathArray([44 | 0x80000000, 1, 1, 0])
    expect(bipPath.toString()).toBe("m/44'/1/1/0")
  })
})

describe('toPathArray()', function () {
  it('should work with proper input', function () {
    const bipPath = BIP32Path.fromPathArray([44 | 0x80000000, 1, 1, 0])
    expect(bipPath.toPathArray()).toStrictEqual([44 | 0x80000000, 1, 1, 0])
  })
})

describe('fromString()', function () {
  it('should work with new style input', function () {
    expect(BIP32Path.fromString(`m/44'/0'/0'`).toString()).toBe(`m/44'/0'/0'`)
  })
  it('should work without m/ prefix', function () {
    expect(BIP32Path.fromString(`44'/0'/0'`).toString()).toBe(`m/44'/0'/0'`)
  })
  it('should require the m/ prefix', function () {
    expect(BIP32Path.fromString(`m/44'/0'/0'`, true).toString()).toBe(`m/44'/0'/0'`)
  })
  it('should require the m/ prefix (and fail)', async () => {
    await expect(() => {
      BIP32Path.fromString(`44'/0'/0'`, true)
    }).toThrow()
  })
  it('should not work with invalid index', async () => {
    await expect(() => {
      BIP32Path.fromString(`44'/2147483648`)
    })
    await expect(() => {
      BIP32Path.fromString(`44'/2147483648'`)
    })
  })
  it('should work with large indexes', function () {
    const bipPath = BIP32Path.fromString(`m/0/2147483647'/1/2147483646'/2`)
    expect(bipPath.toString()).toBe(`m/0/2147483647'/1/2147483646'/2`)
  })
  it('should not return negative indexes', function () {
    const bipPath = BIP32Path.fromString(`m/44'/0'/0'`)
    expect(bipPath.toPathArray()[0]).toBe(2147483692)
  })
})

describe('toString()', function () {
  it('should work with new style output', function () {
    const bipPath = BIP32Path.fromPathArray([44 | 0x80000000, 1, 1, 0])
    expect(bipPath.toString()).toBe("m/44'/1/1/0")
  })
  it('should work with new style output (without m/ prefix)', function () {
    const bipPath = BIP32Path.fromPathArray([44 | 0x80000000, 1, 1, 0])
    expect(bipPath.toString(false)).toBe("44'/1/1/0")
  })
})
