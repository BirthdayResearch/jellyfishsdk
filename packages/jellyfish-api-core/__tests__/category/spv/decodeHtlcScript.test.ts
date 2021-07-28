import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Spv', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  /** Util function to replace a char at index in string */
  const replaceAt = (s: string, index: number, replacement: string): string => s.substr(0, index) + replacement + s.substr(index + replacement.length)

  it('should createHtlc', async () => {
    const pubKeyA = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const pubKeyB = await container.call('spv_getaddresspubkey', [await container.call('spv_getnewaddress')])
    const blocks = 10
    const htlc = await container.call('spv_createhtlc', [pubKeyA, pubKeyB, `${blocks}`])

    const decodedScript = await client.spv.decodeHtlcScript(htlc.redeemScript)
    expect(decodedScript.sellerkey).toStrictEqual(pubKeyA)
    expect(decodedScript.buyerkey).toStrictEqual(pubKeyB)
    expect(decodedScript.blocks).toStrictEqual(blocks)
    expect(decodedScript.hash).toStrictEqual(htlc.seedhash)
  })

  it('should not decodeHtlcScript with redeemscript not as hex format', async () => {
    const promise = client.spv.decodeHtlcScript('XXXX')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Redeemscript expected in hex format', code: -3, method: spv_decodehtlcscript")
  })

  it('should not decodeHtlcScript with redeemscript with incorrect length', async () => {
    const promise = client.spv.decodeHtlcScript('00')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Incorrect redeemscript length', code: -5, method: spv_decodehtlcscript")
  })

  it('should not decodeHtlcScript with redeemscript with invalid seller public key', async () => {
    const redeemscript = '63a82001e7c5853b6d96346eb917445f49132f56bfb2dec56aafbf6a2a310b0d0b6e9f8821024adf8f420049083e5a28d88ea40d8441cf55d1a5aafce3ae5812fe1668548c92675ab2752103088a9944e39df3196e40d3edd4ea1f291eb3103d81ddf98c16bf060bc121ad8368ac'
    const sellerPublicKey = '024adf8f420049083e5a28d88ea40d8441cf55d1a5aafce3ae5812fe1668548c92'
    const tamperedRedeemScript = redeemscript.replace(sellerPublicKey, '000000000000000000000000000000000000000000000000000000000000000000') // '0' * 66 (sellerPublicKey length)
    const promise = client.spv.decodeHtlcScript(tamperedRedeemScript)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid seller pubkey', code: -5, method: spv_decodehtlcscript")
  })

  it('should not decodeHtlcScript with redeemscript with invalid buyer public key', async () => {
    const redeemscript = '63a82001e7c5853b6d96346eb917445f49132f56bfb2dec56aafbf6a2a310b0d0b6e9f8821024adf8f420049083e5a28d88ea40d8441cf55d1a5aafce3ae5812fe1668548c92675ab2752103088a9944e39df3196e40d3edd4ea1f291eb3103d81ddf98c16bf060bc121ad8368ac'
    const buyerPublicKey = '03088a9944e39df3196e40d3edd4ea1f291eb3103d81ddf98c16bf060bc121ad83'
    const tamperedRedeemScript = redeemscript.replace(buyerPublicKey, '000000000000000000000000000000000000000000000000000000000000000000') // '0' * 66 (buyerPublicKey length)
    const promise = client.spv.decodeHtlcScript(tamperedRedeemScript)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid buyer pubkey', code: -5, method: spv_decodehtlcscript")
  })

  it('should not decodeHtlcScript with redeemscript with invalid seller public key length', async () => {
    const redeemscript = '63a82001e7c5853b6d96346eb917445f49132f56bfb2dec56aafbf6a2a310b0d0b6e9f8821024adf8f420049083e5a28d88ea40d8441cf55d1a5aafce3ae5812fe1668548c92675ab2752103088a9944e39df3196e40d3edd4ea1f291eb3103d81ddf98c16bf060bc121ad8368ac'
    /**
     * Tamper seller public key length.
     * Should be 0x41 or 0x21 as seen in `ain` repository src/pubkey.h
     * PUBLIC_KEY_SIZE=65
     * COMPRESSED_PUBLIC_KEY_SIZE=33
     */
    const tamperedRedeemScript = replaceAt(redeemscript, 72, '9') // Temper seller public key length to 0x91
    const promise = client.spv.decodeHtlcScript(tamperedRedeemScript)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Seller pubkey incorrect pubkey length', code: -5, method: spv_decodehtlcscript")
  })

  it('should not decodeHtlcScript with redeemscript with invalid buyer public key length', async () => {
    const redeemscript = '63a82001e7c5853b6d96346eb917445f49132f56bfb2dec56aafbf6a2a310b0d0b6e9f8821024adf8f420049083e5a28d88ea40d8441cf55d1a5aafce3ae5812fe1668548c92675ab2752103088a9944e39df3196e40d3edd4ea1f291eb3103d81ddf98c16bf060bc121ad8368ac'
    /**
     * Tamper buyer public key length.
     * Should be 0x41 or 0x21 as seen in `ain` repository src/pubkey.h
     * PUBLIC_KEY_SIZE=65
     * COMPRESSED_PUBLIC_KEY_SIZE=33
     */
    const tamperedRedeemScript = replaceAt(redeemscript, 148, '9') // Temper buyer public key length to 0x91
    const promise = client.spv.decodeHtlcScript(tamperedRedeemScript)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Buyer pubkey incorrect pubkey length', code: -5, method: spv_decodehtlcscript")
  })

  it('should not decodeHtlcScript with redeemscript with incorrect timeout length', async () => {
    const redeemscript = '63a82001e7c5853b6d96346eb917445f49132f56bfb2dec56aafbf6a2a310b0d0b6e9f8821024adf8f420049083e5a28d88ea40d8441cf55d1a5aafce3ae5812fe1668548c92675ab2752103088a9944e39df3196e40d3edd4ea1f291eb3103d81ddf98c16bf060bc121ad8368ac'
    /**
     * Tamper timeout length.
     * Should >= OP_1 as seen in `ain` repository src/spv/spv_wrapper.cpp:977
     */
    const tamperedRedeemScript = replaceAt(redeemscript, 142, '1') // Temper timeout length to 0x1a
    const promise = client.spv.decodeHtlcScript(tamperedRedeemScript)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Incorrect timeout length', code: -5, method: spv_decodehtlcscript")
  })

  it('should not decodeHtlcScript with redeemscript with incorrect seed hash length', async () => {
    const redeemscript = '63a82001e7c5853b6d96346eb917445f49132f56bfb2dec56aafbf6a2a310b0d0b6e9f8821024adf8f420049083e5a28d88ea40d8441cf55d1a5aafce3ae5812fe1668548c92675ab2752103088a9944e39df3196e40d3edd4ea1f291eb3103d81ddf98c16bf060bc121ad8368ac'
    /**
     * Tamper seed hash length.
     * Should be 0x20 as seen in `ain` repository src/spv/spv_wrapper.cpp:949
     */
    const tamperedRedeemScript = replaceAt(redeemscript, 4, '9') // Tamper seed hash length to 0x90
    const promise = client.spv.decodeHtlcScript(tamperedRedeemScript)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Incorrect seed hash length', code: -5, method: spv_decodehtlcscript")
  })
})
