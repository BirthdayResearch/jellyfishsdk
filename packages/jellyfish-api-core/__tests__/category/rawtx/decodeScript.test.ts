import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError, wallet } from '../../../src'

describe('Decodescript()', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should decode empty script', async () => {
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

    expect(decode.asm).toStrictEqual(addressInfo.witness_version + ' ' + addressInfo.witness_program)
    expect(decode.reqSigs).toStrictEqual(1)
    expect(decode.type).toStrictEqual('witness_v0_keyhash')
    expect(decode.addresses).toStrictEqual([addressInfo.address])
  })

  it('should decode scriptPubKey from P2SH_SEGWIT address', async () => {
    const address = await testing.container.getNewAddress('', wallet.AddressType.P2SH_SEGWIT)
    const addressInfo = await testing.rpc.wallet.getAddressInfo(address)
    const scriptPk = addressInfo.scriptPubKey

    const withoutOpCodes = addressInfo.scriptPubKey.substring(4, 44)
    const decode = await testing.rpc.rawtx.decodeScript(scriptPk)

    expect(decode.asm).toStrictEqual('OP_HASH160 ' + withoutOpCodes + ' OP_EQUAL')
    expect(decode.reqSigs).toStrictEqual(1)
    expect(decode.type).toStrictEqual('scripthash')
    expect(decode.addresses).toStrictEqual([addressInfo.address])
  })

  it('should decode scriptPubKey from LEGACY address', async () => {
    const address = 'n2H1Mrobo5PH2grhDa1Kkz6ThYkLmyXLwR'
    const scriptPk = (await testing.rpc.wallet.getAddressInfo(address)).scriptPubKey

    const decode = await testing.rpc.rawtx.decodeScript(scriptPk)

    expect(decode).toStrictEqual({
      asm: 'OP_DUP OP_HASH160 e3b7608590327594e40ec1412ec27681086959d9 OP_EQUALVERIFY OP_CHECKSIG',
      reqSigs: 1,
      type: 'pubkeyhash',
      addresses: [ 'n2H1Mrobo5PH2grhDa1Kkz6ThYkLmyXLwR' ],
      p2sh: '2NC1bsXjkxWvmhp7TNiFgPF3yBRVCrYXzhb',
      segwit: {
        asm: '0 e3b7608590327594e40ec1412ec27681086959d9',
        hex: '0014e3b7608590327594e40ec1412ec27681086959d9',
        reqSigs: 1,
        type: 'witness_v0_keyhash',
        addresses: [ 'bcrt1quwmkppvsxf6efeqwc9qjasnksyyxjkwejd3yaw' ],
        'p2sh-segwit': '2N2GB1X4scdpHDBgtQxLyLnjL9mrdhpKczw'
      }
    })
  })

  it('should flag random data as nulldata', async () => {
    const random = '48304502207fa7a6d1e0ee81132a269ad84e68d695483745cde8b541e3bf630749894e342a022100c1f7ab20e13e22fb95281a870f3dcf38d782e53023ee313d741ad0cfbc0c509001'
    const decode = await testing.rpc.rawtx.decodeScript('6a' + random)
    const withoutOpCodes = random.substring(2)

    expect(decode.asm).toStrictEqual('OP_RETURN ' + withoutOpCodes)
    expect(decode.type).toStrictEqual('nulldata')
    expect(decode.p2sh).toStrictEqual('2N9YehGXCtVh6nsnkd1ptpoavdSRvod9RAb')
  })

  it('should throw error for a non-hexadecimal string', async () => {
    const address = 'text'
    const decode = await testing.rpc.rawtx.decodeScript(address)
    
    //the following is a WIP
    expect(decode).toMatchObject({        
      payload: {
        code: -8,
        message: "argument must be hexadecimal string (not 'text')", 
        method: 'decodescript'
      }
    })
  })
})
