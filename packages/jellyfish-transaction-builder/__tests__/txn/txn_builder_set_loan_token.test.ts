import { GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
const testing = Testing.create(container)

let providers: MockProviders
let builder: P2WPKHTransactionBuilder

let priceFeedId: string

beforeAll(async () => {
  await testing.container.start()
  await testing.container.waitForWalletCoinbaseMaturity()

  providers = await getProviders(testing.container)
  providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

  priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
    token: 'Token',
    currency: 'Currency'
  }], 1])
  await testing.generate(1)
})

afterAll(async () => {
  await testing.container.stop()
})

beforeEach(async () => {
  // Fund 10 DFI UTXO
  await fundEllipticPair(testing.container, providers.ellipticPair, 10)
  await providers.setupMocks() // Required to move utxos
})

describe('loan.setLoanToken()', () => {
  it('should setLoanToken', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token1',
      name: 'Token1',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0)
    }, script)

    // const loanTokenId = calculateTxid(txn)

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure you don't send all your balance away during set default loan scheme
    const prevouts = await providers.prevout.all()
    expect(prevouts.length).toStrictEqual(1)
    expect(prevouts[0].value.toNumber()).toBeLessThan(10)
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)

    // const data = await testing.container.call('listloantokens', [])
    // expect(data).toStrictEqual({
    //   [loanTokenId]: {
    //     token: {
    //       1: {
    //         symbol: 'Token1',
    //         symbolKey: 'Token1',
    //         name: 'Token1',
    //         decimal: 8,
    //         limit: 0,
    //         mintable: false,
    //         tradeable: true,
    //         isDAT: true,
    //         isLPS: false,
    //         finalized: false,
    //         isLoanToken: true,
    //         minted: 0,
    //         creationTx: loanTokenId,
    //         creationHeight: expect.any(Number),
    //         destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
    //         destructionHeight: -1,
    //         collateralAddress: expect.any(String)
    //       }
    //     },
    //     priceFeedId,
    //     interest: 0
    //   }
    // })
  })

  it('should setLoanToken if symbol is more than 8 letters', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'ABCDEFGHI', // 9 letters
      name: 'Token2',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0)
    }, script)

    const loanTokenId = calculateTxid(txn)
    // const outs = await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('ABCDEFGH') // Only remain the first 8 letters
  })

  it('should not setLoanToken if symbol is an empty string', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.loans.setLoanToken({
      symbol: '', // 9 letters
      name: 'Token3',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0)
    }, script)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntoken symbol should be non-empty and starts with a letter\', code: -32600, method: setloantoken')
  })

  it('should not setLoanToken if token with same symbol was created before', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.loans.setLoanToken({
      symbol: 'Token4',
      name: 'Token4',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0)
    }, script)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntoken \'Token4\' already exists!\', code: -32600, method: setloantoken')
  })

  it('should setLoanToken if name is more than 128 letters', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token5',
      name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXY',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0)
    }, script)
    const loanTokenId = calculateTxid(txn)
    // const outs = await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWX') // Only remain first 128 letters.
  })

  it('should not setLoanToken if priceFeedId is invalid', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.loans.setLoanToken({
      symbol: 'Token6',
      name: 'Token6',
      priceFeedId: 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b',
      mintable: true,
      interest: new BigNumber(0)
    }, script)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntoken \'Token4\' already exists!\', code: -32600, method: setloantoken')
  })

  it('should setLoanToken if mintable is false', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token7',
      name: 'Token7',
      priceFeedId,
      mintable: false,
      interest: new BigNumber(0)
    }, script)

    // const loanTokenId = calculateTxid(txn)
    await sendTransaction(testing.container, txn)
  })

  it('should setLoanToken if interest is greater than 0', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token8',
      name: 'Token8',
      priceFeedId,
      mintable: false,
      interest: new BigNumber(0.2)
    }, script)

    // const loanTokenId = calculateTxid(txn)
    await sendTransaction(testing.container, txn)
  })

  it('should not setLoanToken if interest is less than 0', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.loans.setLoanToken({
      symbol: 'Token9',
      name: 'Token9',
      priceFeedId,
      mintable: false,
      interest: new BigNumber(-0.01)
    }, script)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntoken \'Token4\' already exists!\', code: -32600, method: setloantoken')
  })
})
