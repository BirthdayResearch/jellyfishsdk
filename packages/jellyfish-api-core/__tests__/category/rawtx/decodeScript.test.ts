import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'

describe('Decodescript()', () => {
    const container = new MasterNodeRegTestContainer()
    const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should decode scriptPubKey', async () => {
    const address = await testing.container.getNewAddress()
    const addressInfo = await testing.rpc.wallet.getAddressInfo(address)

    const scriptPK = addressInfo.scriptPubKey
    const decode = await testing.rpc.rawtx.decodeScript(scriptPK)

    console.log(addressInfo)
    console.log(scriptPK)
    console.log(decode) //console log results align expectations
  })

it('should decode a hardcoded P2PK scriptSig correctly', async () => {
    const signature = '304502207fa7a6d1e0ee81132a269ad84e68d695483745cde8b541e3bf630749894e342a022100c1f7ab20e13e22fb95281a870f3dcf38d782e53023ee313d741ad0cfbc0c509001'
    const push_signature = '48' + signature

    const decodeScriptResult = await testing.rpc.rawtx.decodeScript(push_signature)
    expect(decodeScriptResult.asm).toStrictEqual(signature)
  })

  it('should decode a hardcoded P2PKH scriptSig correctly', async () => {
    const signature = '304502207fa7a6d1e0ee81132a269ad84e68d695483745cde8b541e3bf630749894e342a022100c1f7ab20e13e22fb95281a870f3dcf38d782e53023ee313d741ad0cfbc0c509001'
    const push_signature = '48' + signature
    const public_key = '03b0da749730dc9b4b1f4a14d6902877a92541f5368778853d9c4a0cb7802dcfb2'
    const push_public_key = '21' + public_key

    const decodeScriptResult = await testing.rpc.rawtx.decodeScript(push_signature + push_public_key)
    expect(decodeScriptResult.asm).toStrictEqual(signature + ' ' + public_key)
  })
})