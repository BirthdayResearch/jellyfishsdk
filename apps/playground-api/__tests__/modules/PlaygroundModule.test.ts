import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { ConsortiumKey } from '../../src/ConsortiumKey'
import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'

const pg = PlaygroundApiTesting.create()
const testing = pg.testing

beforeAll(async () => {
  await pg.start()
})

afterAll(async () => {
  await pg.stop()
})

it('should have pool pairs setup', async () => {
  const pairs = await testing.container.call('listpoolpairs')
  expect(Object.values(pairs).length).toBe(17)
})

it('should have tokens setup', async () => {
  const tokens = await testing.container.call('listtokens')
  expect(Object.values(tokens).length).toBe(36)
})

it('should have oracles setup', async () => {
  const oracles = await testing.container.call('listoracles')
  expect(Object.values(oracles).length).toBe(3)
})

it('should have masternode setup', async () => {
  const oracles = await testing.container.call('listmasternodes')

  expect(Object.values(oracles).length).toBe(10)
})

it('should not have minted more than 200 blocks', async () => {
  const count = await testing.container.call('getblockcount')
  expect(count).toBeLessThanOrEqual(200)
})

it('should have at least 10 million in balance', async () => {
  const balances = await testing.container.call('getbalances')
  expect(balances.mine.trusted).toBeGreaterThanOrEqual(10_000_000)
})

it('should have loan schemes', async () => {
  const results = await testing.container.call('listloanschemes')
  expect(results.length).toBe(6)
})

it('should have loan tokens', async () => {
  const results = await testing.container.call('listloantokens')
  expect(results.length).toBe(5)
})

it('should have loan collateral tokens', async () => {
  const results = await testing.container.call('listcollateraltokens')
  expect(results.length).toBe(14)
})

it('should have gov set', async () => {
  const gov = await testing.container.call('getgov', ['ATTRIBUTES'])
  expect(gov).toStrictEqual({
    ATTRIBUTES: {
      'v0/consortium/1/members': {
        '01': {
          backingId: 'backing_address_btc_1_c',
          mintLimit: 50,
          mintLimitDaily: 5,
          name: 'Waves HQ',
          ownerAddress: ConsortiumKey.address,
          status: 0
        },
        '02': {
          backingId: 'backing_address_btc_1_br, backing_address_btc_2_br',
          mintLimit: 50,
          mintLimitDaily: 5,
          name: 'Alexandria',
          ownerAddress: RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.address,
          status: 0
        }
      },
      'v0/consortium/2/members': {
        '01': {
          backingId: 'backing_address_eth_1_c',
          mintLimit: 10,
          mintLimitDaily: 5,
          name: 'Waves HQ',
          ownerAddress: ConsortiumKey.address,
          status: 0
        },
        '02': {
          backingId: 'backing_address_eth_1_br, backing_address_eth_2_br',
          mintLimit: 10,
          mintLimitDaily: 5,
          name: 'Alexandria',
          ownerAddress: RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.address,
          status: 0
        }
      },
      'v0/consortium/1/mint_limit': '50',
      'v0/consortium/1/mint_limit_daily': '5',
      'v0/consortium/2/mint_limit': '20',
      'v0/consortium/2/mint_limit_daily': '10',
      'v0/live/economy/evm/block/fee_burnt': 0,
      'v0/live/economy/evm/block/fee_burnt_max': 0,
      'v0/live/economy/evm/block/fee_burnt_max_hash': expect.any(String),
      'v0/live/economy/evm/block/fee_burnt_min': 92233720368.54776,
      'v0/live/economy/evm/block/fee_burnt_min_hash': '0000000000000000000000000000000000000000000000000000000000000000',
      'v0/live/economy/evm/block/fee_priority': 0,
      'v0/live/economy/evm/block/fee_priority_max': 0,
      'v0/live/economy/evm/block/fee_priority_max_hash': expect.any(String),
      'v0/live/economy/evm/block/fee_priority_min': 92233720368.54776,
      'v0/live/economy/evm/block/fee_priority_min_hash': '0000000000000000000000000000000000000000000000000000000000000000',
      'v0/live/economy/loans': expect.any(Array),
      'v0/params/dfip2203/active': 'true',
      'v0/params/dfip2203/block_period': '20',
      'v0/params/dfip2203/fee_pct': '0.05',
      'v0/params/dfip2203/reward_pct': '0.05',
      'v0/params/feature/consortium': 'true',
      'v0/params/feature/gov': 'true',
      'v0/token/0/fixed_interval_price_id': 'DFI/USD',
      'v0/token/0/loan_collateral_enabled': 'true',
      'v0/token/0/loan_collateral_factor': '1',
      'v0/token/1/fixed_interval_price_id': 'BTC/USD',
      'v0/token/1/loan_collateral_enabled': 'true',
      'v0/token/1/loan_collateral_factor': '1',
      'v0/token/2/fixed_interval_price_id': 'ETH/USD',
      'v0/token/2/loan_collateral_enabled': 'true',
      'v0/token/2/loan_collateral_factor': '0.7',
      'v0/token/3/fixed_interval_price_id': 'USDT/USD',
      'v0/token/3/loan_collateral_enabled': 'true',
      'v0/token/3/loan_collateral_factor': '1',
      'v0/token/5/fixed_interval_price_id': 'USDC/USD',
      'v0/token/5/loan_collateral_enabled': 'true',
      'v0/token/5/loan_collateral_factor': '1',
      'v0/token/6/fixed_interval_price_id': 'CU10/USD',
      'v0/token/6/loan_collateral_enabled': 'true',
      'v0/token/6/loan_collateral_factor': '1',
      'v0/token/7/fixed_interval_price_id': 'CD10/USD',
      'v0/token/7/loan_collateral_enabled': 'true',
      'v0/token/7/loan_collateral_factor': '1',
      'v0/token/8/fixed_interval_price_id': 'CS25/USD',
      'v0/token/8/loan_collateral_enabled': 'true',
      'v0/token/8/loan_collateral_factor': '1',
      'v0/token/9/fixed_interval_price_id': 'CR50/USD',
      'v0/token/9/loan_collateral_enabled': 'true',
      'v0/token/9/loan_collateral_factor': '1',
      'v0/token/10/fixed_interval_price_id': 'ZERO/USD',
      'v0/token/10/loan_collateral_enabled': 'true',
      'v0/token/10/loan_collateral_factor': '1',
      'v0/token/11/fixed_interval_price_id': 'OFF/USD',
      'v0/token/11/loan_collateral_enabled': 'true',
      'v0/token/11/loan_collateral_factor': '1',
      'v0/token/12/fixed_interval_price_id': 'EUROC/USD',
      'v0/token/12/loan_collateral_enabled': 'true',
      'v0/token/12/loan_collateral_factor': '1',
      'v0/token/13/fixed_interval_price_id': 'MATIC/USD',
      'v0/token/13/loan_collateral_enabled': 'true',
      'v0/token/13/loan_collateral_factor': '1',
      'v0/token/14/payback_dfi': 'true',
      'v0/token/14/payback_dfi_fee_pct': '0.01',
      'v0/token/14/loan_payback/1': 'true',
      'v0/token/14/loan_payback/16': 'true',
      'v0/token/14/loan_payback_fee_pct/1': '0.01',
      'v0/token/14/loan_payback_fee_pct/16': '0.01',
      'v0/token/14/fixed_interval_price_id': 'DUSD/USD',
      'v0/token/14/loan_collateral_enabled': 'true',
      'v0/token/14/loan_collateral_factor': '1.2',
      'v0/token/14/loan_minting_enabled': 'true',
      'v0/token/14/loan_minting_interest': '0',
      'v0/token/14/loan_payback_collateral': 'true',
      'v0/token/15/loan_payback/6': 'true',
      'v0/token/15/loan_payback/14': 'true',
      'v0/token/15/loan_payback_fee_pct/6': '0.01',
      'v0/token/15/loan_payback_fee_pct/14': '0.01',
      'v0/token/15/fixed_interval_price_id': 'TU10/USD',
      'v0/token/15/loan_minting_enabled': 'true',
      'v0/token/15/loan_minting_interest': '1',
      'v0/token/16/loan_payback/1': 'true',
      'v0/token/16/loan_payback/14': 'true',
      'v0/token/16/loan_payback_fee_pct/1': '0.01',
      'v0/token/16/loan_payback_fee_pct/14': '0.01',
      'v0/token/16/fixed_interval_price_id': 'TD10/USD',
      'v0/token/16/loan_minting_enabled': 'true',
      'v0/token/16/loan_minting_interest': '1.5',
      'v0/token/17/loan_payback/15': 'true',
      'v0/token/17/loan_payback_fee_pct/15': '0.01',
      'v0/token/17/fixed_interval_price_id': 'TS25/USD',
      'v0/token/17/loan_minting_enabled': 'true',
      'v0/token/17/loan_minting_interest': '2',
      'v0/token/18/payback_dfi': 'true',
      'v0/token/18/payback_dfi_fee_pct': '0.01',
      'v0/token/18/loan_payback/14': 'true',
      'v0/token/18/loan_payback/16': 'true',
      'v0/token/18/loan_payback_fee_pct/14': '0.01',
      'v0/token/18/loan_payback_fee_pct/16': '0.01',
      'v0/token/18/fixed_interval_price_id': 'TR50/USD',
      'v0/token/18/loan_minting_enabled': 'true',
      'v0/token/18/loan_minting_interest': '3',
      'v0/params/feature/icx': 'true',
      'v0/params/feature/evm': 'true',
      'v0/transferdomain/dvm-evm/dat-enabled': 'true',
      'v0/transferdomain/evm-dvm/dat-enabled': 'true',
      'v0/transferdomain/evm-dvm/enabled': 'true',
      'v0/params/feature/transferdomain': 'true',
      'v0/params/foundation/members': [
        'bcrt1qyrfrpadwgw7p5eh3e9h3jmu4kwlz4prx73cqny',
        'bcrt1qyeuu9rvq8a67j86pzvh5897afdmdjpyankp4mu',
        'msER9bmJjyEemRpQoS8YYVL21VyZZrSgQ7',
        'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU'
      ],
      'v0/transferdomain/dvm-evm/enabled': 'true',
      'v0/transferdomain/dvm-evm/src-formats': ['bech32', 'p2pkh'],
      'v0/transferdomain/dvm-evm/dest-formats': ['erc55'],
      'v0/transferdomain/evm-dvm/src-formats': ['erc55'],
      'v0/transferdomain/evm-dvm/auth-formats': ['bech32-erc55'],
      'v0/transferdomain/evm-dvm/dest-formats': ['bech32', 'p2pkh']
    }
  })

  async function waitForPriceValid (): Promise<void> {
    const prices = await testing.container.call('listfixedintervalprices')
    const invalidPrices = prices.filter((p: any) => p.isLive !== true)
    for (const p of invalidPrices) {
      await testing.container.waitForPriceValid(p.priceFeedId)
    }
  }

  // paybackV2 test
  const dusdInfo = await testing.rpc.token.getToken('DUSD')
  const dusdId = Object.keys(dusdInfo)[0]
  const td10Info = await testing.rpc.token.getToken('TD10')
  const td10Id = Object.keys(td10Info)[0]
  const tr50Info = await testing.rpc.token.getToken('TR50')
  const tr50Id = Object.keys(tr50Info)[0]
  const tu10Info = await testing.rpc.token.getToken('TU10')
  const tu10Id = Object.keys(tu10Info)[0]
  const ts25Info = await testing.rpc.token.getToken('TS25')
  const ts25Id = Object.keys(ts25Info)[0]

  const colAddr = await testing.container.getNewAddress()
  await testing.token.dfi({ address: colAddr, amount: 15000 })
  await testing.container.call('sendtokenstoaddress', [{}, { [colAddr]: ['1@BTC', '1@ETH', '1@USDT', '1@CU10', '1@CD10'] }])
  await testing.generate(1)

  const vaultId = await testing.rpc.loan.createVault({
    ownerAddress: await testing.container.getNewAddress(),
    loanSchemeId: 'MIN150'
  })
  await testing.generate(1)

  await testing.rpc.loan.depositToVault({
    vaultId: vaultId,
    from: colAddr,
    amount: '10000@DFI'
  })
  await testing.generate(1)

  await waitForPriceValid()
  await testing.rpc.loan.takeLoan({
    vaultId: vaultId,
    to: colAddr,
    amounts: ['100@DUSD', '0.00000095@TD10', '0.06@TR50', '3@TU10', '5@TS25']
  })
  await testing.generate(1)

  // DFI pay dToken
  await waitForPriceValid()
  await testing.rpc.loan.paybackLoan({
    vaultId: vaultId,
    from: colAddr,
    loans: [
      // { dToken: td10Id, amounts: '0.00000001@DFI' }, // x pay
      // { dToken: tu10Id, amounts: '0.00000001@DFI' }, // x pay
      // { dToken: ts25Id, amounts: '0.00000001@DFI' }, // x pay
      { dToken: dusdId, amounts: '0.00000001@DFI' },
      { dToken: tr50Id, amounts: '0.00000001@DFI' }
    ]
  })
  await testing.generate(1)

  // dToken (DUSD) pay dToken #1
  await waitForPriceValid()
  await testing.rpc.loan.paybackLoan({
    vaultId: vaultId,
    from: colAddr,
    loans: [
      // { dToken: ts25Id, amounts: '0.00000001@DUSD' }, // x pay
      { dToken: td10Id, amounts: '0.00000001@DUSD' },
      { dToken: tu10Id, amounts: '0.00000001@DUSD' },
      { dToken: tr50Id, amounts: '0.00000001@DUSD' }
    ]
  })
  await testing.generate(1)

  // dToken pay dToken #2
  await waitForPriceValid()
  await testing.rpc.loan.paybackLoan({
    vaultId: vaultId,
    from: colAddr,
    loans: [
      { dToken: dusdId, amounts: '0.00000001@TD10' },
      { dToken: tr50Id, amounts: '0.00000001@TD10' },
      { dToken: ts25Id, amounts: '0.00000001@TU10' }
    ]
  })
  await testing.generate(1)

  // colToken pay dToken
  await waitForPriceValid()
  await testing.rpc.loan.paybackLoan({
    vaultId: vaultId,
    from: colAddr,
    loans: [
      { dToken: td10Id, amounts: '0.00000001@BTC' },
      { dToken: dusdId, amounts: '0.00000001@BTC' },
      { dToken: tu10Id, amounts: '0.00000001@CU10' }
    ]
  })
  await testing.generate(1)

  // test fail payback
  // DUSD pay TS25 should be failed
  await waitForPriceValid()
  const promise = testing.rpc.loan.paybackLoan({
    vaultId: vaultId,
    from: colAddr,
    loans: [
      { dToken: ts25Id, amounts: '0.00000001@DUSD' }
    ]
  })
  await expect(promise).rejects.toThrow('Payback of loan via DUSD token is not currently active')

  // future swap test
  const swapAddr = await testing.generateAddress()
  await testing.container.call('sendtokenstoaddress', [{}, { [swapAddr]: ['2@TR50'] }])
  await testing.generate(1)

  await waitForPriceValid()
  await testing.rpc.account.futureSwap({
    address: swapAddr,
    amount: '2@TR50'
  })
  await testing.generate(1)

  {
    const pending = await testing.container.call('listpendingfutureswaps')
    expect(pending.length).toStrictEqual(1)
  }

  const attributes = await testing.rpc.masternode.getGov('ATTRIBUTES')
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/active']).toStrictEqual('true')
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/block_period']).toStrictEqual('20')
  expect(attributes.ATTRIBUTES['v0/params/dfip2203/reward_pct']).toStrictEqual('0.05')

  const current = await testing.container.getBlockCount()
  const next = await testing.container.call('getfutureswapblock')
  expect(next - current).toBeLessThanOrEqual(20)
  await testing.generate(next - current)

  {
    const pending = await testing.container.call('listpendingfutureswaps')
    expect(pending.length).toStrictEqual(0)
  }
})
