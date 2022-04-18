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
  expect(Object.values(pairs).length).toBe(14)
})

it('should have tokens setup', async () => {
  const tokens = await testing.container.call('listtokens')
  expect(Object.values(tokens).length).toBe(31)
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
  expect(results.length).toBe(12)
})

it('should have gov set', async () => {
  const gov = await testing.container.call('getgov', ['ATTRIBUTES'])
  expect(gov).toStrictEqual({
    ATTRIBUTES: expect.objectContaining({
      'v0/token/12/payback_dfi': 'true',
      'v0/token/12/payback_dfi_fee_pct': '0.01',
      'v0/token/12/loan_payback/1': 'true',
      'v0/token/12/loan_payback/14': 'true',
      'v0/token/12/loan_payback_fee_pct/1': '0.01',
      'v0/token/12/loan_payback_fee_pct/14': '0.01',
      'v0/token/13/loan_payback/6': 'true',
      'v0/token/13/loan_payback/12': 'true',
      'v0/token/13/loan_payback_fee_pct/6': '0.01',
      'v0/token/13/loan_payback_fee_pct/12': '0.01',
      'v0/token/14/loan_payback/1': 'true',
      'v0/token/14/loan_payback/12': 'true',
      'v0/token/14/loan_payback_fee_pct/1': '0.01',
      'v0/token/14/loan_payback_fee_pct/12': '0.01',
      'v0/token/15/loan_payback/13': 'true',
      'v0/token/15/loan_payback_fee_pct/13': '0.01',
      'v0/token/16/payback_dfi': 'true',
      'v0/token/16/payback_dfi_fee_pct': '0.01',
      'v0/token/16/loan_payback/12': 'true',
      'v0/token/16/loan_payback/14': 'true',
      'v0/token/16/loan_payback_fee_pct/12': '0.01',
      'v0/token/16/loan_payback_fee_pct/14': '0.01'
    })
  })

  // sanity test
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

  {
    const prices = await testing.container.call('listfixedintervalprices')

    const invalidPrices = prices.filter((p: any) => p.isLive !== true)
    for (const p of invalidPrices) {
      await testing.container.waitForPriceValid(p.priceFeedId)
    }
  }

  await testing.rpc.loan.takeLoan({
    vaultId: vaultId,
    to: colAddr,
    amounts: ['100@DUSD', '0.00000095@TD10', '0.06@TR50', '3@TU10', '5@TS25']
  })
  await testing.generate(1)

  // DFI pay dToken
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
  const promise = testing.rpc.loan.paybackLoan({
    vaultId: vaultId,
    from: colAddr,
    loans: [
      { dToken: ts25Id, amounts: '0.00000001@DUSD' }
    ]
  })
  await expect(promise).rejects.toThrow('Payback of loan via DUSD token is not currently active')
})
