import { PlaygroundApiTesting } from '../../testing/PlaygroundApiTesting'
import waitForExpect from 'wait-for-expect'

const pg = PlaygroundApiTesting.create()
const testing = pg.testing

beforeAll(async () => {
  await pg.start()
})

afterAll(async () => {
  await pg.stop()
})

it('setgov "attributes" - enable payback for all dTokens', async () => {
  await waitForExpect(async () => {
    const attributes = (await pg.container.call('getgov', ['ATTRIBUTES'])).ATTRIBUTES
    expect(Object.keys(attributes).length).toBeGreaterThan(0)

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

    await testing.container.waitForPriceValid('TR50/USD')

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
        { dToken: dusdId, amounts: '0.00000001@DFI' },
        { dToken: td10Id, amounts: '0.00000001@DFI' },
        { dToken: tr50Id, amounts: '0.00000001@DFI' },
        { dToken: tu10Id, amounts: '0.00000001@DFI' },
        { dToken: ts25Id, amounts: '0.00000001@DFI' }
      ]
    })
    await testing.generate(1)

    // dToken pay dToken
    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      from: colAddr,
      loans: [
        { dToken: ts25Id, amounts: '0.00000001@DUSD' },
        { dToken: ts25Id, amounts: '0.00000001@TD10' },
        { dToken: tr50Id, amounts: '0.00000001@TS25' },
        { dToken: dusdId, amounts: '0.00000001@TU10' }
      ]
    })
    await testing.generate(1)

    // colToken pay dToken
    await testing.rpc.loan.paybackLoan({
      vaultId: vaultId,
      from: colAddr,
      loans: [
        { dToken: dusdId, amounts: '0.00000001@BTC' },
        { dToken: td10Id, amounts: '0.00000001@ETH' },
        { dToken: tr50Id, amounts: '0.00000001@USDT' },
        { dToken: tu10Id, amounts: '0.00000001@CU10' },
        { dToken: ts25Id, amounts: '0.00000001@CD10' }
      ]
    })
    await testing.generate(1)
  })
})
