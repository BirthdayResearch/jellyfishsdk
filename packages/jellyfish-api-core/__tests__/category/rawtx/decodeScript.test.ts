import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { wallet } from '../../../src'

describe('Decodescript()', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should return empty value for empty script', async () => {
    const address = ''
    const decode = await testing.rpc.rawtx.decodeScript(address)

    expect(decode).toStrictEqual({
      asm: '',
      type: 'nonstandard',
      p2sh: '2N9hLwkSqr1cPQAPxbrGVUjxyjD11G2e1he',
      segwit: {
        asm: '0 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        hex: '0020e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        reqSigs: 1,
        type: 'witness_v0_scripthash',
        addresses: [
          'bcrt1quwcvgs5clswpfxhm7nyfjmaeysn6us0yvjdexn9yjkv3k7zjhp2snwgpgy'
        ],
        'p2sh-segwit': '2N2CmnxjBbPTHrawgG2FkTuBLcJtEzA86sF'
      }
    })
  })

  it('should decode scriptPubKey from BECH32 address', async () => {
    const address = await testing.container.getNewAddress()
    const addressInfo = await testing.rpc.wallet.getAddressInfo(address)
    const scriptPk = addressInfo.scriptPubKey
    const decode = await testing.rpc.rawtx.decodeScript(scriptPk)

    expect(decode).toStrictEqual(expect.objectContaining({
      asm: `${addressInfo.witness_version} ${addressInfo.witness_program}`,
      reqSigs: 1,
      type: 'witness_v0_keyhash',
      addresses: [addressInfo.address]
    }))
  })

  it('should decode scriptPubKey from P2SH_SEGWIT address', async () => {
    const address = await testing.container.getNewAddress('', wallet.AddressType.P2SH_SEGWIT)
    const addressInfo = await testing.rpc.wallet.getAddressInfo(address)
    const scriptPk = addressInfo.scriptPubKey

    const withoutOpCodes = addressInfo.scriptPubKey.substring(4, 44)
    const decode = await testing.rpc.rawtx.decodeScript(scriptPk)

    expect(decode).toStrictEqual(expect.objectContaining({
      asm: `OP_HASH160 ${withoutOpCodes} OP_EQUAL`,
      reqSigs: 1,
      type: 'scripthash',
      addresses: [addressInfo.address]
    }))
  })

  it('should decode scriptPubKey from LEGACY address', async () => {
    const address = 'n2H1Mrobo5PH2grhDa1Kkz6ThYkLmyXLwR'
    const scriptPk = (await testing.rpc.wallet.getAddressInfo(address)).scriptPubKey
    const decode = await testing.rpc.rawtx.decodeScript(scriptPk)

    expect(decode).toStrictEqual({
      asm: 'OP_DUP OP_HASH160 e3b7608590327594e40ec1412ec27681086959d9 OP_EQUALVERIFY OP_CHECKSIG',
      reqSigs: 1,
      type: 'pubkeyhash',
      addresses: ['n2H1Mrobo5PH2grhDa1Kkz6ThYkLmyXLwR'],
      p2sh: '2NC1bsXjkxWvmhp7TNiFgPF3yBRVCrYXzhb',
      segwit: {
        asm: '0 e3b7608590327594e40ec1412ec27681086959d9',
        hex: '0014e3b7608590327594e40ec1412ec27681086959d9',
        reqSigs: 1,
        type: 'witness_v0_keyhash',
        addresses: ['bcrt1quwmkppvsxf6efeqwc9qjasnksyyxjkwejd3yaw'],
        'p2sh-segwit': '2N2GB1X4scdpHDBgtQxLyLnjL9mrdhpKczw'
      }
    })
  })

  it('should decode multisig scriptPubKey', async () => {
    const pubKey0 = '03b0da749730dc9b4b1f4a14d6902877a92541f5368778853d9c4a0cb7802dcfb2'
    const pubKey1 = '03b0da759730dc9b4b1f4a14d6902877a92541f5368778853d9c4a0cb7802dcfb2'
    const pubKey2 = '03b0da769730dc9b4b1f4a14d6902877a92541f5368778853d9c4a0cb7802dcfb2'
    const pushPK0 = `21${pubKey0}`
    const pushPK1 = `21${pubKey1}`
    const pushPK2 = `21${pubKey2}`

    const script = `52${pushPK0}${pushPK1}${pushPK2}53ae`
    const decode = await testing.rpc.rawtx.decodeScript(script)

    expect(decode).toStrictEqual({
      asm: '2 03b0da749730dc9b4b1f4a14d6902877a92541f5368778853d9c4a0cb7802dcfb2 03b0da759730dc9b4b1f4a14d6902877a92541f5368778853d9c4a0cb7802dcfb2 03b0da769730dc9b4b1f4a14d6902877a92541f5368778853d9c4a0cb7802dcfb2 3 OP_CHECKMULTISIG',
      reqSigs: 2,
      type: 'multisig',
      addresses: [
        'mp52VuXfTKhzYpuR3jLvPEYYUCWt84J7D5',
        'mrxE8hHPNJPyvvsbYEc2A163WgV2rebvgZ',
        'n42fKbireJ7NDQzTYKL87xuPrgNuQzwCzt'
      ],
      p2sh: '2N1sgbTQxaaTAZwoiLr7wPDEPxoDyo9Jdo9',
      segwit: {
        asm: '0 7c70a5d9c2b7341ed8f0379921df2ef1642c6a7302e3286e597af2704395a82a',
        hex: '00207c70a5d9c2b7341ed8f0379921df2ef1642c6a7302e3286e597af2704395a82a',
        reqSigs: 1,
        type: 'witness_v0_scripthash',
        addresses: [
          'bcrt1q03c2tkwzku6pak8sx7vjrhew79jzc6nnqt3jsmje0te8qsu44q4qsr7p7t'
        ],
        'p2sh-segwit': '2MwkCzzt4QBEZe1YmTZXaR6AjUMyGQZp8WG'
      }
    })
  })

  it('should flag random data as nulldata', async () => {
    const random = '48304502207fa7a6d1e0ee81132a269ad84e68d695483745cde8b541e3bf630749894e342a022100c1f7ab20e13e22fb95281a870f3dcf38d782e53023ee313d741ad0cfbc0c509001'
    const decode = await testing.rpc.rawtx.decodeScript(`6a${random}`)
    const withoutOpCodes = random.substring(2)

    expect(decode).toStrictEqual(expect.objectContaining({
      asm: `OP_RETURN ${withoutOpCodes}`,
      type: 'nulldata',
      p2sh: '2N9YehGXCtVh6nsnkd1ptpoavdSRvod9RAb'
    }))
  })

  it('should throw error for a non-hexadecimal string', async () => {
    const address = 'text'
    return await expect(testing.rpc.rawtx.decodeScript(address))
      .rejects.toThrow("RpcApiError: 'argument must be hexadecimal string (not 'text')', code: -8, method: decodescript")
  })
})
