/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */

import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { BigNumber, RpcApiError } from '@defichain/jellyfish-api-core'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { createPoolPair } from '@defichain/testing'
import { PlaygroundSetup } from '@defichain-apps/nest-apps/playground-api/src/setups/setup'

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
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' },
      { token: 'GOOGL', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'NVDA', currency: 'USD' }
    ]

    const oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
    await alice.generate(1)

    await alice.rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' },
        { tokenAmount: '1@GOOGL', currency: 'USD' },
        { tokenAmount: '1@TSLA', currency: 'USD' },
        { tokenAmount: '1@NVDA', currency: 'USD' }
      ]
    })
    await alice.generate(1)

    await alice.container.call('setloantoken', [{
      symbol: 'GOOGL',
      name: 'GOOGL',
      fixedIntervalPriceId: 'GOOGL/USD',
      mintable: true,
      interest: 0
    }, []])
    await alice.generate(1)

    await alice.container.call('setloantoken', [{
      symbol: 'DUSD',
      name: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD',
      mintable: true,
      interest: 0
    }, []])
    await alice.generate(1)

    await alice.container.call('setloantoken', [{
      symbol: 'TSLA',
      name: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD',
      mintable: true,
      interest: 0
    }, []])
    await alice.generate(1)

    await alice.container.call('setloantoken', [{
      symbol: 'NVDA',
      name: 'NVDA',
      fixedIntervalPriceId: 'NVDA/USD',
      mintable: true,
      interest: 0
    }, []])
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'DUSD',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'GOOGL',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'GOOGL/USD'
    })
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'TSLA',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await alice.generate(1)

    const dusdId = Object.keys(await alice.rpc.token.getToken('DUSD'))[0]
    const googleId = Object.keys(await alice.rpc.token.getToken('GOOGL'))[0]
    const tslaId = Object.keys(await alice.rpc.token.getToken('TSLA'))[0]
    const nvdaId = Object.keys(await alice.rpc.token.getToken('NVDA'))[0]

    const pair = await alice.rpc.poolpair.createPoolPair({
      tokenA: 'GOOGL',
      tokenB: 'DUSD',
      commission: 0.001,
      status: true,
      ownerAddress: await alice.generateAddress(),
      symbol: 'GOOGL-DUSD'
    })
    await alice.generate(1)

    const mixId = Object.keys(await alice.rpc.token.getToken('GOOGL-DUSD'))[0]

    {
      const key = `v0/poolpairs/${mixId}/token_a_fee_pct`
      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [key]: '0.01' } })
      await alice.generate(1)
    }

    {
      const key = `v0/token/${mixId}/dex_in_fee_pct`
      await alice.rpc.masternode.setGov({ ATTRIBUTES: { [key]: '0.005' } })
      await alice.generate(1)
    }

    {
      const key = `'${mixId}'`
      await alice.rpc.masternode.setGov({ LP_SPLITS: { 5: 1 } })
      await alice.generate(1)
    }

    {
      const key = `'${mixId}'`
      await alice.rpc.masternode.setGov({ LP_LOAN_TOKEN_SPLITS: { 5: 1 } })
      await alice.generate(1)
    }

    await alice.container.call('createloanscheme', [100, new BigNumber(0.5), 'LOAN0001'])
    await alice.generate(1)

    await alice.rpc.account.utxosToAccount({ [await alice.generate(1)]: `${30000}@DFI` })
    await alice.generate(1)
    //
    // # Set pool gov vars
    // self.nodes[0].setgov({"ATTRIBUTES":{f'v0/poolpairs/{self.idGD}/token_a_fee_pct': '0.01', f'v0/poolpairs/{self.idGD}/token_b_fee_pct': '0.03',
    //   f'v0/token/{self.idGOOGL}/dex_in_fee_pct': '0.02', f'v0/token/{self.idGOOGL}/dex_out_fee_pct': '0.005'}})
    // self.nodes[0].setgov({"LP_SPLITS": { str(self.idGD): 1}})
    // self.nodes[0].setgov({"LP_LOAN_TOKEN_SPLITS": { str(self.idGD): 1}})
    // self.nodes[0].generate(1)
  })
})
