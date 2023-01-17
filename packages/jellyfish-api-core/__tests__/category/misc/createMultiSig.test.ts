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

  it('should create multi signature address', async () => {
    let key0 = (await testing.rpc.wallet.getAddressInfo(await testing.rpc.wallet.getNewAddress('', wallet.AddressType.LEGACY))).pubkey
    key0 = ECDH.convertKey(key0, 'secp256k1', 'hex', 'hex', 'uncompressed').toString()
    const key1 = (await testing.rpc.wallet.getAddressInfo(await testing.rpc.wallet.getNewAddress('', wallet.AddressType.LEGACY))).pubkey
    const key2 = (await testing.rpc.wallet.getAddressInfo(await testing.rpc.wallet.getNewAddress('', wallet.AddressType.LEGACY))).pubkey
    const keys = [key0, key1, key2]
    const legacyAddr = (await client.misc.createMultiSig(2, keys, 'legacy')).address
    expect((await client.misc.createMultiSig(2, keys, 'p2sh-segwit')).address).toStrictEqual(legacyAddr)
    expect((await client.misc.createMultiSig(2, keys, 'bech32')).address).toStrictEqual(legacyAddr)
  })

  it('should throw error if key are not valid', async () => {
    const key0 = 'key0'
    const key1 = 'key1'
    const keys = [key0, key1]
    const promise = client.misc.createMultiSig(2, keys, 'legacy')
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
    const key0 = (await testing.rpc.wallet.getAddressInfo(await testing.rpc.wallet.getNewAddress('', wallet.AddressType.LEGACY))).pubkey
    const key1 = (await testing.rpc.wallet.getAddressInfo(await testing.rpc.wallet.getNewAddress('', wallet.AddressType.LEGACY))).pubkey
    const keys = [key0, key1]
    const promise = client.misc.createMultiSig(-2, keys, 'legacy')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'a multisignature address must require at least one key to redeem',
        method: 'createmultisig'
      }
    })
  })

  it('should throw error if addressType is not valid', async () => {
    const key0 = (await testing.rpc.wallet.getAddressInfo(await testing.rpc.wallet.getNewAddress('', wallet.AddressType.LEGACY))).pubkey
    const key1 = (await testing.rpc.wallet.getAddressInfo(await testing.rpc.wallet.getNewAddress('', wallet.AddressType.LEGACY))).pubkey
    const keys = [key0, key1]
    const promise = client.misc.createMultiSig(2, keys, 'addressType')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Unknown address type \'addressType\'',
        method: 'createmultisig'
      }
    })
  })
})
