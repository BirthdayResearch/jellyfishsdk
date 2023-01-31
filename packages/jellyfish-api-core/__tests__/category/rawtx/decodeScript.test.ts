import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '../../../src'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { wallet } from '../../../src'

describe('Decodescript()', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)
  const client = new ContainerAdapterClient(container)

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

  it('should decode scriptPubKey from bech32 address', async () => {
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
    console.log(addressInfo)

    const scriptPk = addressInfo.scriptPubKey
    const withoutOpCodes = addressInfo.scriptPubKey.substring(4, 44)
    const decode = await testing.rpc.rawtx.decodeScript(scriptPk)

    expect(decode.asm).toStrictEqual('OP_HASH160 ' + withoutOpCodes + ' OP_EQUAL')
    expect(decode.reqSigs).toStrictEqual(1)
    expect(decode.type).toStrictEqual('scripthash')
    expect(decode.addresses).toStrictEqual([addressInfo.address])
  })

  it('should decode a null data ', async () => {
    const nulldata = '48304502207fa7a6d1e0ee81132a269ad84e68d695483745cde8b541e3bf630749894e342a022100c1f7ab20e13e22fb95281a870f3dcf38d782e53023ee313d741ad0cfbc0c509001'
    const decodeResult = await testing.rpc.rawtx.decodeScript('6a' + nulldata)
    console.log(decodeResult)
    //expect(decodeScriptResult.asm).toStrictEqual('OP_RETURN ' + nulldata)
    // expect(decodeResult.asm).toStrictEqual('nulldata') //need work
    expect(decodeResult.type).toStrictEqual('nulldata')
    expect(decodeResult.p2sh).toStrictEqual('2N9YehGXCtVh6nsnkd1ptpoavdSRvod9RAb')
  })
  
  it('should not decode a non-hexadecimal string', async () => {
    const address = 'text'
    const decode = await testing.rpc.rawtx.decodeScript(address)
    await expect(decode).rejects.toThrow(RpcApiError)
  
    await expect(decode).rejects.toMatchObject({
      payload: {
        code: -8,
        // message: 'argument must be hexadecimal string (not \'text\')', //fix message
        method: 'decodescript'
      }
    })
  })
})