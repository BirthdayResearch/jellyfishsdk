/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */

import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('Token', () => {
  const tGroup = TestingGroup.create(3, i => new MasterNodeRegTestContainer(GenesisKeys[i]))

  let alice: any
  let peter: any

  beforeAll(async () => {
    await tGroup.start()

    alice = tGroup.get(0)
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

    await alice.rpc.wallet.sendToAddress(account2, 10)
    await alice.generate(1)

    const btcInfo = await alice.rpc.token.getToken('BTC')
    const btcToken = Object.keys(btcInfo)[0]

    const dogeInfo = await alice.rpc.token.getToken('DOGE')
    const dogeToken = Object.keys(dogeInfo)[0]

    await alice.generate(20)
    await tGroup.waitForSync()

    {
      const promise = peter.rpc.token.mintTokens('1@BTC')
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Need foundation or consortium member authorization!')
    }

    {
      const promise = peter.rpc.token.mintTokens('1@DOGE')
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Need foundation or consortium member authorization!')
    }

    await tGroup.waitForSync()

    const CONSORTIUM_MEMBERS = 'v0/consortium/2/members'
    const CONSORTIUM_MINT_LIMIT = 'v0/consortium/2/mint_limit'

    {
      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MEMBERS]: `{"2":{"name":"test","ownerAddress":"${account2}","backingId":"ebf634ef7143bc5466995a385b842649b2037ea89d04d469bfa5ec29daf7d1cf","mintLimit":2.00000000, "status":1}}` } })
      await alice.generate(1)

      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [CONSORTIUM_MINT_LIMIT]: '200000000' } }) // 2
      await alice.generate(1)
    }

    await tGroup.waitForSync()

    {
      await peter.rpc.token.mintTokens('2@DOGE')
      await peter.generate(1)
    }

    {
      const promise = await peter.rpc.token.burnTokens({
        amounts: '1@DOGE',
        from: account2
      })
    }

    await peter.rpc.account.accountToAccount(account2, { [account0]: '1@DOGE' })
    await peter.generate(1)

    // {
    //   await peter.rpc.token.mintTokens('1@DOGE')
    //   await peter.generate(1)
    // }

    {
      await alice.rpc.token.burnTokens({
        amounts: '1@DOGE',
        from: account0,
        context: account2
      })
    }
    //
    //   await expect(promise).rejects.toThrow(RpcApiError)
    //   await expect(promise).rejects.toThrow('Test BurnTokenTx execution failed:\ncalled before GreatWorld height')
    // }

    // const attributes = await peter.rpc.masternode.getGov('ATTRIBUTES')
    // console.log(attributes)
    // await peter.rpc.token.burnTokens({
    //   amounts: '1@BTC',
    //   from: account2
    // })
  })
})
