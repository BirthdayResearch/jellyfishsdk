/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unused-vars */

import { ContainerGroup, DeFiDRpcError, GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasternodeState, MasternodeTimeLock } from '@defichain/jellyfish-api-core/dist/category/masternode'
import { AddressType } from '@defichain/jellyfish-api-core/dist/category/wallet'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { LoanMasterNodeRegTestContainer } from '../loan/loan_container'
import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { RegTestFoundationKeys, RegTestGenesisKeys } from '@defichain/jellyfish-network'

describe('Token', () => {
  const tGroup = TestingGroup.create(3, i => new MasterNodeRegTestContainer(GenesisKeys[i]))

  let alice: any
  let bob: any
  let peter: any

  beforeAll(async () => {
    await tGroup.start()

    alice = tGroup.get(0)
    bob = tGroup.get(1)
    peter = tGroup.get(2)

    await alice.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('x', async () => {
    const account0 = GenesisKeys[0].owner.address
    const account2 = GenesisKeys[2].owner.address

    await alice.token.create(
      {
        symbol: 'BTC',
        name: 'BTC token',
        isDAT: true,
        collateralAddress: account0
      }
    )
    await alice.generate(1)

    await alice.token.create(
      {
        symbol: 'DOGE',
        name: 'DOGE token',
        isDAT: true,
        collateralAddress: account0
      }
    )
    await alice.generate(1)

    // await alice.rpc.wallet.sendToAddress(account2, 10)
    // await alice.generate(1)

    const btcInfo = await alice.rpc.token.getToken('BTC')
    const btcToken = Object.keys(btcInfo)[0]

    {
      const promise = alice.rpc.token.burnTokens({
        amounts: '1@BTC',
        from: account0
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Test BurnTokenTx execution failed:\ncalled before GreatWorld height')
    }

    // {
    //   const promise = peter.rpc.token.mintTokens('1@BTC')
    //   await expect(promise).rejects.toThrow(RpcApiError)
    //   await expect(promise).rejects.toThrow('Need foundation or consortium member authorization!')
    // }

    await alice.generate(10)

    // {
    //   const consortium_members_str_literals = `v0/token/${btcToken}/consortium_members`
    //   const x = await alice.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/token/0/consortium_members': `{"01":{"name":"ab","ownerAddress":"${account2}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":10.00000000}}` } })
    //   console.log(x)
    //
    //   await alice.generate(1)
    // }

    // {
    //   const consortium_members_str_literals = `v0/token/${btcToken}/consortium_members`
    //   const y = await alice.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/token/0/consortium_members': `{"01":{"name":"abcdefgadfdasfsadfadfhadsjklfhasldfhasdfjahd","ownerAddress":"${account0}","backingId":"bbf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":12.00000000}}` } })
    //   await alice.generate(1)
    // }

    const attributes = await peter.rpc.masternode.getGov('ATTRIBUTES')
    console.log(attributes)
    //
    // {
    //   const blockCount = await alice.rpc.blockchain.getBlockCount()
    //   expect(blockCount).toStrictEqual(103)
    // }
    //
    // await alice.generate(7)
    //
    // {
    //   const blockCount = await alice.rpc.blockchain.getBlockCount() // reach greatworldheight
    //   expect(blockCount).toStrictEqual(110)
    // }
    //
    // {
    //   // const consortium_members_str_literals = `v0/token/${btcToken}/consortium_members`
    //   await alice.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/token/0/consortium_members': `{"01":{"name":"test","ownerAddress":"${account2}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":10.00000000}}` } })
    //   await alice.generate(1)
    // }
    //
    // const consortiumMintLimitStrLiterals = `v0/token/${btcToken}/consortium_mint_limit`
    // await alice.rpc.masternode.setGov({ ATTRIBUTES: { [consortiumMintLimitStrLiterals]: '1000000000' } })
    // await alice.generate(1)
    //
    // {
    //   // const consortium_members_str_literals = `v0/token/${btcToken}/consortium_members`
    //   const promise = alice.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/token/0/consortium_members': `{"03":{"name":"test","ownerAddress":"${account2}","backingId":"7cb2f6954291d81d2270c9a6a52442b3f8c637b1ec793c731cb5f5a8f7fb9b9d","mintLimit":10.00000000}}` } })
    //   await expect(promise).rejects.toThrow(RpcApiError)
    //   await expect(promise).rejects.toThrow('Cannot add a member with an owner address of a existing consortium member')
    // }
    //
    // const attributes = await peter.rpc.masternode.getGov('ATTRIBUTES')
    // console.log(attributes)
    //
    // {
    //   const promise = peter.rpc.token.mintTokens('1@DOGE')
    //   await expect(promise).rejects.toThrow(RpcApiError)
    //   await expect(promise).rejects.toThrow('Need foundation or consortium member authorization!')
    // }
    //
    // await tGroup.waitForSync()
    // await peter.rpc.token.mintTokens('1@BTC')
    // await peter.generate(1)
  })
})
