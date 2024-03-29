import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Get Custom TX', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if invalid tx', async () => {
    const promise = client.token.decodeCustomTx('000')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -22,
        message: 'TX decode failed',
        method: 'decodecustomtx'
      }
    })
  })

  it('should throw error if witness flag is false on witness TX', async () => {
    // raw data of 0010c59335d9dcca98531ddb809258829cdfbac88ac953afb8e4e620873b6b7f
    const promise = client.token.decodeCustomTx('040000000001012abaf715b5fbed90406a4b40b96c0aa562265568b107d51560f96d0e73dfc9d80100000000fdffffff020000000000000000476a454466547853e8888f0acc092b8c4e60d895e1368e0f20596776f073e9ce4988b2aa0a5a3843160014ffbdc8c27db5abd43917b309e2884f3bf8ea832f0feac243a90300000000b620090000000000160014ffbdc8c27db5abd43917b309e2884f3bf8ea832f00024730440220776dbb86676f26e62e7624b879cc5d6cfba20a8f5aa600950a7da2eac6a600a902204495c5a9123333a75fad85882034cdcb6dd87b15e237a1b20686d320271820f401210275a8747349619132a3a1708a3db1c8d34ea6053d1758c90b4b25bb3f704579fc00000000', false)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -22,
        message: 'TX decode failed',
        method: 'decodecustomtx'
      }
    })
  })

  it('should fail if coinbase tx', async () => {
    // raw data of b7db79537b12d9195cd066b3b753769fe81a40e380a9bb61e7c8405ca8f3649c
    const res = await client.token.decodeCustomTx('040000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff0503b0632500ffffffff036741bb6e010000001976a91413d4431d52eb3b0d69da2f6b9ff3ca00ff95a13888ac00e06106360000000017a914dd7730517e0e4969b4e43677ff5bee682e53420a87000000000000000000266a24aa21a9edbc2842d4049400181996ac667c3493be2da9e65c5355fd4db50fdb50a836bcd2000120000000000000000000000000000000000000000000000000000000000000000000000000')
    expect(res).toStrictEqual('Coinbase transaction. Not a custom transaction.')
  })

  it('should fail if not custom tx', async () => {
    // raw data of 0010c59335d9dcca98531ddb809258829cdfbac88ac953afb8e4e620873b6b7f
    const res = await client.token.decodeCustomTx('04000000000102aaac80ae37b370600e2c125f897e45ca51a01bfa45b48f82e1ceb5305709ff4a0100000000ffffffffaaac80ae37b370600e2c125f897e45ca51a01bfa45b48f82e1ceb5305709ff4a0200000000ffffffff02e4f058e70a0000001600148074c1cbadd0c5cd3e328a4a85769296d4f88f9b00ae95980000000000160014b634b8cdb17e196551d5b27f8118f523aa0b07a40002473044022047081709493b10b3e2c92ea1342218d12ba1e6ca8112767f897d7b6687f3655202203639c1a3fa19670e4bbcf5a27f30869ea9528c4bd2fe2131e3d273295b1648430121030ae5092bc2415b1fb565d8ee1cb03afc3dee8ac1c0292106e94f69c60e12b6040247304402201bec5a01af13cdd6bad1631252dde40c7409d69a45e2842483b499b4c7d239a90220447100133f5b1e1b9e42cf499fa5b1316e917c6db0492bcb98b9ad70672e67510121030ae5092bc2415b1fb565d8ee1cb03afc3dee8ac1c0292106e94f69c60e12b60400000000')
    expect(res).toStrictEqual('Not a custom transaction')
  })

  it('should return custom tx data', async () => {
    // raw data of 407bee741668a7406b9b49c1560fe5b15148f86aad031781d0a7e4b6cb9763d0
    const res = await client.token.decodeCustomTx('040000000001012abaf715b5fbed90406a4b40b96c0aa562265568b107d51560f96d0e73dfc9d80100000000fdffffff020000000000000000476a454466547853e8888f0acc092b8c4e60d895e1368e0f20596776f073e9ce4988b2aa0a5a3843160014ffbdc8c27db5abd43917b309e2884f3bf8ea832f0feac243a90300000000b620090000000000160014ffbdc8c27db5abd43917b309e2884f3bf8ea832f00024730440220776dbb86676f26e62e7624b879cc5d6cfba20a8f5aa600950a7da2eac6a600a902204495c5a9123333a75fad85882034cdcb6dd87b15e237a1b20686d320271820f401210275a8747349619132a3a1708a3db1c8d34ea6053d1758c90b4b25bb3f704579fc00000000')
    expect(res).toMatchObject({
      txid: '407bee741668a7406b9b49c1560fe5b15148f86aad031781d0a7e4b6cb9763d0',
      type: 'DepositToVault',
      valid: true,
      results: {
        vaultId: '43385a0aaab28849cee973f0766759200f8e36e195d8604e8c2b09cc0a8f88e8',
        from: 'bcrt1ql77u3snakk4agwghkvy79zz080uw4qe0jqw2vh',
        amount: '157.24692202@15'
      }
    })
  })
})
