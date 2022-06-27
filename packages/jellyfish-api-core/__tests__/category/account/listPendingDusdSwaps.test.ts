import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'
import { DfTxType } from '@defichain/jellyfish-api-core/dist/category/account'

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)
const dusdContractAddr = 'bcrt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqz7nafu8'
const futInterval = 25
let startBlock: number
let colAddr: string

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}

async function range (): Promise<number> {
  const h = await testing.container.getBlockCount()
  const next = h + (futInterval - ((h - startBlock) % futInterval))
  return next - h
}

async function setup (): Promise<void> {
  colAddr = await testing.generateAddress()
  await testing.token.dfi({ address: colAddr, amount: 100000 })

  await testing.token.create({ symbol: 'DUSD', collateralAddress: colAddr })
  await testing.generate(1)

  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'DUSD', currency: 'USD' }
  ]

  const oracleId = await testing.rpc.oracle.appointOracle(
    await testing.generateAddress(),
    priceFeeds,
    {
      weightage: 1
    })
  await testing.generate(1)

  await testing.rpc.oracle.setOracleData(
    oracleId,
    now(),
    {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '1@DUSD', currency: 'USD' }
      ]
    }
  )
  await testing.generate(1)

  await testing.rpc.masternode.setGov({
    ATTRIBUTES: {
      'v0/token/0/fixed_interval_price_id': 'DFI/USD',
      'v0/token/0/loan_collateral_enabled': 'true',
      'v0/token/0/loan_collateral_factor': '1'
    }
  })
  await testing.generate(1)

  await testing.rpc.masternode.setGov({
    ATTRIBUTES: {
      'v0/token/1/fixed_interval_price_id': 'DUSD/USD',
      'v0/token/1/loan_minting_enabled': 'true',
      'v0/token/1/loan_minting_interest': '0'
    }
  })
  await testing.generate(1)

  // set dfi to dusd govs
  {
    startBlock = 10 + await testing.container.getBlockCount()

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2206f/reward_pct': '0.05',
        'v0/params/dfip2206f/block_period': `${futInterval}`,
        'v0/params/dfip2206f/start_block': `${startBlock}`
      }
    })
    await testing.generate(1)

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/dfip2206f/active': 'true'
      }
    })
    await testing.generate(startBlock - await testing.container.getBlockCount())

    // Retrieve and verify gov vars
    const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attributes.ATTRIBUTES['v0/params/dfip2206f/active']).toStrictEqual('true')
    expect(attributes.ATTRIBUTES['v0/params/dfip2206f/reward_pct']).toStrictEqual('0.05')
    expect(attributes.ATTRIBUTES['v0/params/dfip2206f/block_period']).toStrictEqual(`${futInterval}`)
    expect(attributes.ATTRIBUTES['v0/params/dfip2206f/start_block']).toStrictEqual(`${startBlock}`)
  }
}

describe('listPendingDusdSwaps', () => {
  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should listPendingDusdSwaps', async () => {
    await testing.rpc.account.futureSwap({
      address: colAddr,
      amount: '30@DFI',
      destination: 'DUSD'
    })
    await testing.generate(1)
    await testing.rpc.account.futureSwap({
      address: colAddr,
      amount: '44@DFI',
      destination: 'DUSD'
    })
    await testing.generate(1)

    const list = await testing.rpc.account.listPendingDusdSwaps()
    expect(list.length).toStrictEqual(2)
    expect(list[0].owner).toStrictEqual(colAddr)
    expect(list[0].amount).toStrictEqual(new BigNumber(44))
    expect(list[1].owner).toStrictEqual(colAddr)
    expect(list[1].amount).toStrictEqual(new BigNumber(30))

    await testing.generate(await range())

    // check acc history
    const history = await testing.rpc.account.listAccountHistory(
      'all',
      {
        maxBlockHeight: await testing.container.getBlockCount(),
        depth: 1,
        txtype: DfTxType.FUTURE_SWAP_EXECUTION // 'q'
      })
    expect(history.length).toStrictEqual(2)
    expect(history[0].owner).toStrictEqual(colAddr)
    expect(history[0].type).toStrictEqual('FutureSwapExecution')
    expect(history[0].amounts).toStrictEqual(['41.80000000@DUSD']) // 44 - (44 * 0.05)
    expect(history[1].amounts).toStrictEqual(['28.50000000@DUSD']) // 30 - (30 * 0.05)

    // should be empty
    const listAfter = await testing.rpc.account.listPendingDusdSwaps()
    expect(listAfter.length).toStrictEqual(0)

    const dusdContractAcc = await testing.rpc.account.getAccount(dusdContractAddr)
    expect(dusdContractAcc).toStrictEqual(['74.00000000@DFI']) // 30 + 44

    const { ATTRIBUTES: attrs } = await testing.rpc.masternode.getGov('ATTRIBUTES')
    expect(attrs['v0/live/economy/dfip2206f_current']).toStrictEqual(['74.00000000@DFI']) // 30 + 44
    expect(attrs['v0/live/economy/dfip2206f_burned']).toStrictEqual(['74.00000000@DFI']) // 30 + 44
    expect(attrs['v0/live/economy/dfip2206f_minted']).toStrictEqual(['70.30000000@DUSD']) // 74 - (74 * 0.05)

    const burn = await testing.rpc.account.getBurnInfo()
    expect(burn.dfip2206f).toStrictEqual(['74.00000000@DFI']) // 30 + 44
  })
})
