import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { CreateCfp, OP_CODES } from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { governance } from '@defichain/jellyfish-api-core'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { TxnBuilderError } from '../../src/txn/txn_builder_error'

describe('createCfp', () => {
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const testing = Testing.create(new MasterNodeRegTestContainer())
  const fundAmount = 12101110

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.container.waitForWalletBalanceGTE(11)
    await fundEllipticPair(testing.container, providers.ellipticPair, fundAmount)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it.each([{
    nAmount: 10,
    creationFee: 10,
    changeRange: [fundAmount - 10.001, fundAmount - 10]
  }, {
    nAmount: 1000,
    creationFee: 10,
    changeRange: [fundAmount - 20.001, fundAmount - 20]
  }, {
    nAmount: 100000,
    creationFee: 1000,
    changeRange: [fundAmount - 1020.001, fundAmount - 1020]
  }])('should createCfp', async (expectedAmounts) => {
    const script = await providers.elliptic.script()
    const createCfp: CreateCfp = {
      type: 0x01,
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(expectedAmounts.nAmount),
      address: script,
      nCycles: 2,
      options: 0x00
    }
    const txn = await builder.governance.createCfp(createCfp, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_CFP(createCfp).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    // Ensure the created txn is correct
    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(expectedAmounts.creationFee)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
    expect(outs[1].value).toBeGreaterThan(expectedAmounts.changeRange[0])
    expect(outs[1].value).toBeLessThan(expectedAmounts.changeRange[1])
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())

    // Ensure balance is deducted properly
    const prevouts = await providers.prevout.all()
    expect(prevouts[0].value.toNumber()).toBeGreaterThan(expectedAmounts.changeRange[0])
    expect(prevouts[0].value.toNumber()).toBeLessThan(expectedAmounts.changeRange[1])

    const listProposals = await testing.rpc.governance.listGovProposals()
    const txid = calculateTxid(txn)

    const proposal = listProposals.find(el => el.proposalId === txid)
    expect(proposal).toStrictEqual({
      proposalId: txid,
      title: createCfp.title,
      context: createCfp.context,
      contextHash: createCfp.contexthash,
      type: governance.ProposalType.COMMUNITY_FUND_PROPOSAL,
      status: governance.ProposalStatus.VOTING,
      amount: createCfp.nAmount,
      currentCycle: 1,
      totalCycles: createCfp.nCycles,
      fee: expectedAmounts.creationFee,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      payoutAddress: expect.any(String),
      approvalThreshold: expect.any(String),
      quorum: expect.any(String),
      votingPeriod: expect.any(Number)
    })
  })

  it('should reject if the amount is negative', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.governance.createCfp({
      type: 0x01,
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(-100),
      address: script,
      nCycles: 5,
      options: 0x00
    }, script)

    await expect(promise).rejects.toThrow('The value of "value" is out of range. It must be >= 0 and <= 4294967295. Received -1410065408')
  })

  it('should reject if proposal cycles > 100', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.governance.createCfp({
      type: 0x01,
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(100),
      address: script,
      nCycles: 101,
      options: 0x00
    }, script)

    await expect(promise).rejects.toThrow(TxnBuilderError)
    await expect(promise).rejects.toThrow('CreateCfp cycles should be between 0 and 100')
  })

  it('should reject with empty title', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createCfp({
      type: 0x01,
      title: '',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(100),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal title must not be empty', code: -26")
  })

  it('should reject with invalid title length', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createCfp({
      type: 0x01,
      title: 'X'.repeat(150),
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(100),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal title cannot be more than 128 bytes', code: -26")
  })

  it('should reject with empty context', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createCfp({
      type: 0x01,
      title: 'Testing new community fund proposal',
      context: '',
      contexthash: '<context hash>',
      nAmount: new BigNumber(100),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal context must not be empty', code: -26")
  })

  it('should reject with invalid context length', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createCfp({
      type: 0x01,
      title: 'Testing new community fund proposal',
      context: 'X'.repeat(513),
      contexthash: '<context hash>',
      nAmount: new BigNumber(100),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal context cannot be more than 512 bytes', code: -26")
  })

  it('should reject with invalid context hash length', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createCfp({
      type: 0x01,
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: 'X'.repeat(513),
      nAmount: new BigNumber(100),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal context hash cannot be more than 512 bytes', code: -26")
  })

  it('should reject if proposal wants to gain all money (amount exceeds 1.2B DFI)', async () => {
    const MAX_MONEY = 1200000000
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createCfp({
      type: 0x01,
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: 'X'.repeat(513),
      nAmount: new BigNumber(MAX_MONEY),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal wants to gain all money', code: -26")
  })
})
