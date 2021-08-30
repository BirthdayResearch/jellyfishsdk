import { GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'

const container = new LoanMasterNodeRegTestContainer()
const testing = Testing.create(container)

let providers: MockProviders
let builder: P2WPKHTransactionBuilder

let priceFeedId: string
let loanTokenId: string

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

  loanTokenId = await testing.container.call('setloantoken', [{
    symbol: 'Token1',
    name: 'Token1',
    priceFeedId,
    mintable: true,
    interest: new BigNumber(0.01)
  }, []])
  await testing.generate(1)
})

afterAll(async () => {
  await testing.container.stop()
})

beforeEach(async () => {
  await fundEllipticPair(testing.container, providers.ellipticPair, 10) // Fund 10 DFI UTXO
  await providers.setupMocks() // Required to move utxos
})

afterEach(async () => {
  const data = await testing.container.call('listloantokens', [])
  const index = Object.keys(data).indexOf(loanTokenId) + 1
  if (data[loanTokenId].token[index].symbol === 'Token2') { // If Token2, always update it back to Token1
    await testing.container.call('updateloantoken', [
      'Token2',
      {
        symbol: 'Token1',
        name: 'Token1',
        priceFeedId,
        mintable: true,
        interest: new BigNumber(0)
      }, []
    ])
    await testing.generate(1)
  }
})

describe('loan.updateLoanToken()', () => {
  it('should updateLoanToken', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token2',
      name: 'Token2',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.01),
      tokenTx: loanTokenId
    }, script)

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

    const data = await testing.container.call('listloantokens', [])
    expect(data).toStrictEqual({
      [loanTokenId]: {
        token: {
          1: {
            symbol: 'Token2',
            symbolKey: 'Token2',
            name: 'Token2',
            decimal: 8,
            limit: 0,
            mintable: false,
            tradeable: true,
            isDAT: true,
            isLPS: false,
            finalized: false,
            isLoanToken: true,
            minted: 0,
            creationTx: loanTokenId,
            creationHeight: expect.any(Number),
            destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
            destructionHeight: -1,
            collateralAddress: expect.any(String)
          }
        },
        priceFeedId,
        interest: 0.01
      }
    })
  })

  it('should not updateLoanToken if tokenTx does not exist', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token2',
      name: 'Token2',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.02),
      tokenTx: 'd6e157b66957dda2297947e31ac2a1d0c92eae515f35bc1ebad9478d06efa3c0'
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanUpdateLoanTokenTx: Loan token (d6e157b66957dda2297947e31ac2a1d0c92eae515f35bc1ebad9478d06efa3c0) does not exist! (code 16)\', code: -26')
  })

  it('should updateLoanToken if symbol is more than 8 letters', async () => {
    const loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'Token3',
      name: 'Token3',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.03)
    }, []])
    await testing.generate(1)

    await fundEllipticPair(testing.container, providers.ellipticPair, 10) // Fund 10 DFI UTXO
    await providers.setupMocks() // Required to move utxos

    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'ABCDEFGHI',
      name: 'Token3',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.04),
      tokenTx: loanTokenId
    }, script)
    await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('ABCDEFGH') // Only remain the first 8 letters
  })

  it('should not updateLoanToken if symbol is an empty string', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: '',
      name: 'Token2',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.05),
      tokenTx: loanTokenId
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanUpdateLoanTokenTx: token symbol should be non-empty and starts with a letter (code 16)\', code: -26')
  })

  it('should not updateLoanToken if token with same symbol was created before', async () => {
    const loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'Token4',
      name: 'Token4',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.06)
    }, []])
    await testing.generate(1)

    await fundEllipticPair(testing.container, providers.ellipticPair, 10) // Fund 10 DFI UTXO
    await providers.setupMocks() // Required to move utxos

    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token1',
      name: 'Token4',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.07),
      tokenTx: loanTokenId
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanUpdateLoanTokenTx: token with key \'Token1\' already exists! (code 16)\', code: -26')
  })

  it('should updateLoanToken if name is more than 128 letters', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token2',
      name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXY',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.08),
      tokenTx: loanTokenId
    }, script)
    await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWX') // Only remain the first 128 letters
  })

  // NOTE(jingyi2811): There is bug in C++ side
  // it('should not updateLoanToken if priceFeedId is invalid', async () => {
  //   const script = await providers.elliptic.script()
  //   const txn = await builder.loans.updateLoanToken({
  //     symbol: 'Token2',
  //     name: 'Token2',
  //     priceFeedId: 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b',
  //     mintable: true,
  //     interest: new BigNumber(0),
  //     tokenTx: loanTokenId
  //   }, script)
  //   const promise = sendTransaction(testing.container, txn)
  //   await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanUpdateLoanTokenTx: oracle (5f69005ad4aa52d067fecd21ff75d484625d269bbae401a3937d21cbd0c384dd) does not exist! (code 16)\', code: -26')
  // })
})
