import { MainNet, TestNet } from '@defichain/jellyfish-network'
import { OP_CODES } from '@defichain/jellyfish-transaction/src/script'
import { RegTestContainer } from '@defichain/testcontainers'
import { P2PKH } from '../dist'
import { Base58Address, DeFiAddress } from '../src/index'

describe('P2PKH', () => {
  const container = new RegTestContainer()
  const p2pkhFixture = {
    mainnet: '8JBuS81VT8ouPrT6YS55qoS74D13Cw7h1Y',
    testnet: '7LMorkhKTDjbES6DfRxX2RiNMbeemUkxmp',
    regtest: ''
  }

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    p2pkhFixture.regtest = await container.getNewAddress()
  })

  it('from()', () => {
    const p2pkh = DeFiAddress.from('mainnet', p2pkhFixture.mainnet)
    expect(p2pkh.valid).toBeTruthy()
    expect(p2pkh.type).toBe('P2PKH')
    expect(p2pkh.constructor.name).toBe('P2PKH')
    expect(p2pkh.network).toBe(MainNet)
  })

  it('should be able to validate in address prefix with network', () => {
    const p2pkh = DeFiAddress.from('testnet', p2pkhFixture.mainnet)
    expect(p2pkh.valid).toBeFalsy()
    expect(p2pkh.type).toBe('P2PKH')
    expect(p2pkh.network).toBe(TestNet)
  })

  it('should refuse to build ops code stack for invalid address', () => {
    const invalid = DeFiAddress.from('testnet', p2pkhFixture.mainnet)
    expect(invalid.valid).toBeFalsy()
    try {
      invalid.getScript()
    } catch (e) {
      expect(e.message).toBe('InvalidDefiAddress')
    }
  })

  it('should be able to build script', async () => {
    const address = await container.getNewAddress('', 'legacy')
    const p2pkh = DeFiAddress.from('regtest', address)
    const scriptStack = p2pkh.getScript()

    expect(scriptStack.stack.length).toEqual(5)
    expect(scriptStack.stack[0]).toEqual(OP_CODES.OP_DUP)
    expect(scriptStack.stack[1]).toEqual(OP_CODES.OP_HASH160)
    // expect(scriptStack.stack[2]).toEqual(OP_PUSHDATA)
    expect(scriptStack.stack[3]).toEqual(OP_CODES.OP_EQUALVERIFY)
    expect(scriptStack.stack[4]).toEqual(OP_CODES.OP_CHECKSIG)
  })

  it('to()', () => {
    const pubKeyHash = '134b0749882c225e8647df3a3417507c6f5b2797'
    const p2pkh = Base58Address.to<P2PKH>('regtest', pubKeyHash, P2PKH)
    expect(p2pkh.type).toEqual('P2PKH')

    const scriptStack = p2pkh.getScript()
    expect(scriptStack.stack.length).toEqual(5)
    expect(scriptStack.stack[0]).toEqual(OP_CODES.OP_DUP)
    expect(scriptStack.stack[1]).toEqual(OP_CODES.OP_HASH160)
    expect(scriptStack.stack[2]).toEqual(OP_CODES.OP_PUSHDATA_HEX_LE(pubKeyHash))
    expect(scriptStack.stack[3]).toEqual(OP_CODES.OP_EQUALVERIFY)
    expect(scriptStack.stack[4]).toEqual(OP_CODES.OP_CHECKSIG)
  })

  it('guess()', () => {
    const p2pkh = DeFiAddress.guess(p2pkhFixture.mainnet)
    expect(p2pkh.valid).toBeTruthy()
    expect(p2pkh.type).toBe('P2PKH')
    expect(p2pkh.constructor.name).toBe('P2PKH')
    expect(p2pkh.network).toBe(MainNet)
  })
})
