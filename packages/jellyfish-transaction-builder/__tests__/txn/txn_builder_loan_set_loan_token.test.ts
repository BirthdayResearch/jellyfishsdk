import { GenesisKeys } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'

describe('loan.setLoanToken()', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  beforeEach(async () => {
    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos
  })

  it('should setLoanToken', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token1',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token1',
      name: 'Token1',
      currencyPair: { token: 'Token1', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(0.5)
    }, script)

    // Ensure the created txn is correct.
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[1].value).toBeLessThan(10)
    expect(outs[1].value).toBeGreaterThan(9.999)
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    const loanTokenId = calculateTxid(txn)
    const data = await testing.container.call('listloantokens', [])
    expect(data).toStrictEqual({
      [loanTokenId]: {
        token: {
          1: {
            symbol: 'Token1',
            symbolKey: 'Token1',
            name: 'Token1',
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
            creationHeight: await testing.container.getBlockCount(),
            destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
            destructionHeight: -1,
            collateralAddress: expect.any(String)
          }
        },
        priceFeedId: 'Token1/USD',
        interest: 0.5
      }
    })
  })

  it('should setLoanToken if symbol is more than 8 letters', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'x'.repeat(8),
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'x'.repeat(9), // 9 letters
      name: 'x'.repeat(9),
      currencyPair: { token: 'x'.repeat(8), currency: 'USD' },
      mintable: true,
      interest: new BigNumber(1.5)
    }, script)

    await sendTransaction(testing.container, txn)
    const loanTokenId = calculateTxid(txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('x'.repeat(8)) // Only remain the first 8 letters
  })

  it('should not setLoanToken if symbol is an empty string', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token2',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: '',
      name: '',
      currencyPair: { token: 'Token2', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(2.5)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('LoanSetLoanTokenTx: token symbol should be non-empty and starts with a letter (code 16)\', code: -26')
  })

  it('should not setLoanToken if token with same symbol was created before', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token3',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'Token3',
      priceFeedId: 'Token3/USD'
    })
    await testing.generate(1)

    // Fund 10 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 10)
    await providers.setupMocks() // Required to move utxos

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token3',
      name: 'Token3',
      currencyPair: { token: 'Token3', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(3.5)
    }, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanSetLoanTokenTx: token \'Token3\' already exists! (code 16)\', code: -26')
  })

  it('should not setLoanToken if priceFeedId does not belong to any oracle', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token4',
      name: 'Token4',
      currencyPair: { token: 'MFST', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(4.5)
    }, script)
    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow('DeFiDRpcError: \'LoanSetLoanTokenTx: Price feed MFST/USD does not belong to any oracle (code 16)\', code: -26')
  })

  it('should setLoanToken with the given name', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token5',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token5',
      name: 'Token5',
      currencyPair: { token: 'Token5', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(6.5)
    }, script)

    await sendTransaction(testing.container, txn)
    const loanTokenId = calculateTxid(txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('Token5')
  })

  it('should setLoanToken if name is more than 128 letters', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token6',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token6',
      name: 'x'.repeat(129), // 129 letters
      currencyPair: { token: 'Token6', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(7.5)
    }, script)

    await sendTransaction(testing.container, txn)
    const loanTokenId = calculateTxid(txn)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('x'.repeat(128)) // Only remain the first 128 letters.
  })

  it('should setLoanToken if two loan tokens have the same name', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token7',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'Token7',
      name: 'TokenX',
      priceFeedId: 'Token7/USD'
    })
    await testing.generate(1)

    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token8',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token8',
      name: 'TokenX',
      currencyPair: { token: 'Token8', currency: 'USD' },
      mintable: true,
      interest: new BigNumber(8.5)
    }, script)

    await sendTransaction(testing.container, txn)
    const loanTokenId = calculateTxid(txn)
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
  })

  it('should setLoanToken if mintable is false', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token9',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token9',
      name: 'Token9',
      currencyPair: { token: 'Token9', currency: 'USD' },
      mintable: false,
      interest: new BigNumber(9.5)
    }, script)

    await sendTransaction(testing.container, txn)
    const loanTokenId = calculateTxid(txn)
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
  })

  it('should setLoanToken if interest number is greater than 0', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token10',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const script = await providers.elliptic.script()
    const txn = await builder.loans.setLoanToken({
      symbol: 'Token10',
      name: 'Token10',
      currencyPair: { token: 'Token10', currency: 'USD' },
      mintable: false,
      interest: new BigNumber(15.12345678)
    }, script)

    await sendTransaction(testing.container, txn)
    const loanTokenId = calculateTxid(txn)
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
  })
})
