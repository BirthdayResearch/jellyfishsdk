import { GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'

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
  builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

  priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
    token: 'Token1',
    currency: 'USD'
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

beforeEach(async () => {
  await fundEllipticPair(testing.container, providers.ellipticPair, 10) // Fund 10 DFI UTXO
  await providers.setupMocks() // Required to move utxos
})

afterEach(async () => {
  const data = await testing.container.call('listloantokens', [])
  const index = Object.keys(data).indexOf(loanTokenId) + 1
  if (data[loanTokenId].token[index].symbol === 'Token2') { // If Token2, always update it back to Token1
    await testing.rpc.loan.updateLoanToken('Token2', {
      symbol: 'Token1',
      name: 'Token1',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.01)
    })
  }
  await testing.generate(1)
})

afterAll(async () => {
  await testing.container.stop()
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
            mintable: true,
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

  it('should updateLoanToken if symbol is more than 8 letters', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token3',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

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
      symbol: 'x'.repeat(9), // 9 letters
      name: 'Token3',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.04),
      tokenTx: loanTokenId
    }, script)
    await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('x'.repeat(8)) // Only remain the first 8 letters
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
    const priceFeedId1 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token4',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'Token4',
      name: 'Token4',
      priceFeedId: priceFeedId1,
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
      name: 'x'.repeat(129), // 129 letters,
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.08),
      tokenTx: loanTokenId
    }, script)
    await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('x'.repeat(128)) // Only remain the first 128 letters
  })

  it('should updateLoanToken if two loan tokens have the same name', async () => {
    const priceFeedId2 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token5',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'Token5',
      name: 'Token5',
      priceFeedId: priceFeedId2
    })
    await testing.generate(1)

    await fundEllipticPair(testing.container, providers.ellipticPair, 10) // Fund 10 DFI UTXO
    await providers.setupMocks() // Required to move utxos

    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token1',
      name: 'Token1',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.08),
      tokenTx: loanTokenId
    }, script) // Same name as Token1's name
    await sendTransaction(testing.container, txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('Token1')
  })

  it('should not updateLoanToken if priceFeedId is invalid', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.updateLoanToken({
      symbol: 'Token2',
      name: 'Token2',
      priceFeedId: 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b',
      mintable: true,
      interest: new BigNumber(0.09),
      tokenTx: loanTokenId
    }, script)
    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanUpdateLoanTokenTx: oracle (e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b) does not exist! (code 16)\', code: -26')
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
})
