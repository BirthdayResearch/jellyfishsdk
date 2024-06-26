import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { CreateVoc, OP_CODES } from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { governance } from '@defichain/jellyfish-api-core'
import { TxnBuilderError } from '../../src/txn/txn_builder_error'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('createVoc', () => {
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
    await fundEllipticPair(testing.container, providers.ellipticPair, 20050)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createVoc', async () => {
    const script = await providers.elliptic.script()
    const createVoc: CreateVoc = {
      type: 0x02,
      title: 'a vote of confidence',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(0),
      address: {
        stack: []
      },
      nCycles: 1,
      options: 0x00
    }
    const txn = await builder.governance.createVoc(createVoc, script)
    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_VOC(createVoc).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(5)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    const listProposals = await testing.rpc.governance.listGovProposals()
    const txid = calculateTxid(txn)

    const proposal = listProposals.find(el => el.proposalId === txid)
    expect(proposal).toStrictEqual({
      proposalId: txid,
      title: createVoc.title,
      context: createVoc.context,
      contextHash: createVoc.contexthash,
      type: governance.ProposalType.VOTE_OF_CONFIDENCE,
      status: governance.ProposalStatus.VOTING,
      currentCycle: 1,
      totalCycles: createVoc.nCycles,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      approvalThreshold: expect.any(String),
      fee: expect.any(Number),
      quorum: expect.any(String),
      votingPeriod: expect.any(Number)
    })
  })

  it('should create emergency voc', async () => {
    const script = await providers.elliptic.script()
    const createVoc: CreateVoc = {
      type: 0x02,
      title: 'a vote of confidence',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(0),
      address: {
        stack: []
      },
      nCycles: 1,
      options: 0x01 // emergency voc
    }
    const txn = await builder.governance.createVoc(createVoc, script)
    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_VOC(createVoc).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(10000)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    const listProposals = await testing.rpc.governance.listGovProposals()
    const txid = calculateTxid(txn)

    const proposal = listProposals.find(el => el.proposalId === txid)
    expect(proposal).toStrictEqual({
      proposalId: txid,
      title: createVoc.title,
      context: createVoc.context,
      contextHash: createVoc.contexthash,
      type: governance.ProposalType.VOTE_OF_CONFIDENCE,
      status: governance.ProposalStatus.VOTING,
      currentCycle: 1,
      totalCycles: createVoc.nCycles,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      approvalThreshold: expect.any(String),
      fee: expect.any(Number),
      quorum: expect.any(String),
      votingPeriod: expect.any(Number),
      options: ['emergency']
    })
  })

  it('should reject with invalid amount', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.governance.createVoc({
      type: 0x02,
      title: 'vote of confidence',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(10),
      address: {
        stack: []
      },
      nCycles: 1,
      options: 0x00
    }, script)

    await expect(promise).rejects.toThrow(TxnBuilderError)
    await expect(promise).rejects.toThrow('CreateVoc amount should be 0')
  })

  it('should reject with invalid address', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.governance.createVoc({
      type: 0x02,
      title: 'vote of confidence',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(0),
      address: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('8b5401d88a3d4e54fc701663dd99a5ab792af0a4'),
          OP_CODES.OP_EQUAL
        ]
      },
      nCycles: 1,
      options: 0x00
    }, script)

    await expect(promise).rejects.toThrow(TxnBuilderError)
    await expect(promise).rejects.toThrow('CreateVoc address stack should be empty')
  })

  it('should reject with empty title', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createVoc({
      type: 0x02,
      title: '',
      nAmount: new BigNumber(0),
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      address: {
        stack: []
      },
      nCycles: 1,
      options: 0x00
    }, script)
    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateVocTx: proposal title must not be empty', code: -26")
  })

  it('should reject with invalid title length', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createVoc({
      type: 0x02,
      title: 'X'.repeat(150),
      nAmount: new BigNumber(0),
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      address: {
        stack: []
      },
      nCycles: 1,
      options: 0x00
    }, script)
    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateVocTx: proposal title cannot be more than 128 bytes', code: -26")
  })

  it('should reject with empty context', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createVoc({
      type: 0x02,
      title: 'vote of confidence',
      nAmount: new BigNumber(0),
      context: '',
      contexthash: '<context hash>',
      address: {
        stack: []
      },
      nCycles: 1,
      options: 0x00
    }, script)
    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateVocTx: proposal context must not be empty', code: -26")
  })

  it('should reject with invalid context length', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createVoc({
      type: 0x02,
      title: 'vote of confidence',
      nAmount: new BigNumber(0),
      context: 'X'.repeat(513),
      contexthash: '<context hash>',
      address: {
        stack: []
      },
      nCycles: 1,
      options: 0x00
    }, script)
    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateVocTx: proposal context cannot be more than 512 bytes', code: -26")
  })

  it('should reject with invalid context hash length', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createVoc({
      type: 0x02,
      title: 'vote of confidence',
      nAmount: new BigNumber(0),
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: 'X'.repeat(513),
      address: {
        stack: []
      },
      nCycles: 1,
      options: 0x00
    }, script)
    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateVocTx: proposal context hash cannot be more than 512 bytes', code: -26")
  })
})
