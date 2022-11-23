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

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.container.waitForWalletBalanceGTE(11)
    await fundEllipticPair(testing.container, providers.ellipticPair, 12000100)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createCfp', async () => {
    const script = await providers.elliptic.script()
    const createCfp: CreateCfp = {
      type: 0x01,
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(10),
      address: script,
      nCycles: 2,
      options: 0x00
    }
    const txn = await builder.governance.createCfp(createCfp, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_CFP(createCfp).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(10)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    const listProposals = await testing.rpc.container.call('listgovproposals')
    const txid = calculateTxid(txn)

    const proposal = listProposals.find((el: governance.ProposalInfo) => el.proposalId === txid)
    expect(proposal).toStrictEqual({
      proposalId: txid,
      title: createCfp.title,
      context: createCfp.context,
      contextHash: createCfp.contexthash,
      type: 'CommunityFundProposal',
      status: governance.ProposalStatus.VOTING,
      amount: createCfp.nAmount.toNumber(),
      currentCycle: 1,
      totalCycles: createCfp.nCycles,
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      payoutAddress: expect.any(String)
    })
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
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal title must not be empty (code 16)', code: -26")
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
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal title cannot be more than 128 bytes (code 16)', code: -26")
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
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal context must not be empty (code 16)', code: -26")
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
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal context cannot be more than 512 bytes (code 16)', code: -26")
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
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal context hash cannot be more than 512 bytes (code 16)', code: -26")
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
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal wants to gain all money (code 16)', code: -26")
  })
})
