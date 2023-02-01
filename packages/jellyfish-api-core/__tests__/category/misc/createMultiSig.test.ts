import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { wallet } from '@defichain/jellyfish-api-core'
import { RpcApiError } from '../../../src'
import { Testing } from '@defichain/jellyfish-testing'
import { ECDH } from 'node:crypto'

describe('create multi sig', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function getNewKey (walletType: wallet.AddressType): Promise<string> {
    return (await testing.rpc.wallet.getAddressInfo(await testing.rpc.wallet.getNewAddress('', walletType))).pubkey
  }

  it('should create multi signature address 2-3', async () => {
    let key0 = await getNewKey(wallet.AddressType.LEGACY)
    key0 = ECDH.convertKey(key0, 'secp256k1', 'hex', 'hex', 'uncompressed').toString()
    const key1 = await getNewKey(wallet.AddressType.LEGACY)
    const key2 = await getNewKey(wallet.AddressType.LEGACY)
    const keys = [key0, key1, key2]
    const { address } = await client.misc.createMultiSig(2, keys, wallet.AddressType.LEGACY)
    expect((await client.misc.createMultiSig(2, keys, wallet.AddressType.P2SH_SEGWIT)).address).toStrictEqual(address)
    expect((await client.misc.createMultiSig(2, keys, wallet.AddressType.BECH32)).address).toStrictEqual(address)
  })

  it('should create multi signature address 2-2', async () => {
    let key0 = await getNewKey(wallet.AddressType.LEGACY)
    key0 = ECDH.convertKey(key0, 'secp256k1', 'hex', 'hex', 'uncompressed').toString()
    const key1 = await getNewKey(wallet.AddressType.LEGACY)
    const keys = [key0, key1]
    const { address } = await client.misc.createMultiSig(2, keys, wallet.AddressType.LEGACY)
    expect((await client.misc.createMultiSig(2, keys, wallet.AddressType.P2SH_SEGWIT)).address).toStrictEqual(address)
    expect((await client.misc.createMultiSig(2, keys, wallet.AddressType.BECH32)).address).toStrictEqual(address)
  })

  it('should throw error if key are not valid', async () => {
    const key0 = 'key0'
    const key1 = 'key1'
    const keys = [key0, key1]
    const promise = client.misc.createMultiSig(2, keys, wallet.AddressType.LEGACY)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Invalid public key: key0\n.',
        method: 'createmultisig'
      }
    })
  })

  it('should throw error if nRequired < 0', async () => {
    const key0 = await getNewKey(wallet.AddressType.LEGACY)
    const key1 = await getNewKey(wallet.AddressType.LEGACY)
    const keys = [key0, key1]
    const promise = client.misc.createMultiSig(-2, keys, wallet.AddressType.LEGACY)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'a multisignature address must require at least one key to redeem',
        method: 'createmultisig'
      }
    })
  })

  it('should throw error if there is not enough key', async () => {
    const key0 = await getNewKey(wallet.AddressType.LEGACY)
    const keys = [key0]
    const promise = client.misc.createMultiSig(2, keys, wallet.AddressType.LEGACY)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'not enough keys supplied (got 1 keys, but need at least 2 to redeem)',
        method: 'createmultisig'
      }
    })
  })

  it('should throw error if there is to many keys', async () => {
    const key0 = await getNewKey(wallet.AddressType.LEGACY)
    const keys = [key0, key0, key0, key0, key0, key0, key0, key0, key0, key0, key0, key0, key0, key0, key0, key0, key0, key0]
    const promise = client.misc.createMultiSig(2, keys, wallet.AddressType.LEGACY)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'Number of keys involved in the multisignature address creation > 16\nReduce the number',
        method: 'createmultisig'
      }
    })
  })
})
