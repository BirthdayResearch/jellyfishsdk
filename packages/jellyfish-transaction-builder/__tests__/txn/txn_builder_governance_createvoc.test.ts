import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { CreateGovVoc, OP_CODES } from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { governance } from '@defichain/jellyfish-api-core'
import { TxnBuilderError } from '../../src/txn/txn_builder_error'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('createGovVoc', () => {
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const testing = Testing.create(new MasterNodeRegTestContainer(RegTestFoundationKeys[RegTestFoundationKeys.length - 1]))

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.container.waitForWalletBalanceGTE(11)
    await fundEllipticPair(testing.container, providers.ellipticPair, 11) // Amount needed for two createGovVoc creation + fees
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createGovVoc', async () => {
    const script = await providers.elliptic.script()
    const createGovVoc: CreateGovVoc = {
      type: 0x03,
      title: 'vote of confidence',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(0),
      address: {
        stack: []
      },
      cycles: 2
    }
    const txn = await builder.governance.createGovVoc(createGovVoc, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_VOC(createGovVoc).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(5)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    const listGovProposals = await testing.rpc.governance.listGovProposals()
    const txid = calculateTxid(txn)

    const proposal = listGovProposals.find(el => el.proposalId === txid)
    expect(proposal).toStrictEqual({
      proposalId: txid,
      title: createGovVoc.title,
      context: createGovVoc.context,
      type: governance.ProposalType.VOTE_OF_CONFIDENCE,
      status: governance.ProposalStatus.VOTING,
      amount: createGovVoc.amount,
      cyclesPaid: 1,
      totalCycles: createGovVoc.cycles,
      finalizeAfter: expect.any(Number),
      payoutAddress: ''
    })
  })

  it('should reject with invalid amount', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.governance.createGovVoc({
      type: 0x03,
      title: 'vote of confidence',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(10),
      address: {
        stack: []
      },
      cycles: 2
    }, script)

    await expect(promise).rejects.toThrow(TxnBuilderError)
    await expect(promise).rejects.toThrow('CreateGovVoc amount should be 0')
  })

  it('should reject with invalid address', async () => {
    const script = await providers.elliptic.script()
    const promise = builder.governance.createGovVoc({
      type: 0x03,
      title: 'vote of confidence',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(0),
      address: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('8b5401d88a3d4e54fc701663dd99a5ab792af0a4'),
          OP_CODES.OP_EQUAL
        ]
      },
      cycles: 2
    }, script)

    await expect(promise).rejects.toThrow(TxnBuilderError)
    await expect(promise).rejects.toThrow('CreateGovVoc address stack should be empty')
  })

  it('should reject with invalid title length', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createGovVoc({
      type: 0x03,
      title: 'X'.repeat(150),
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(0),
      address: {
        stack: []
      },
      cycles: 2
    }, script)
    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateVocTx: proposal title cannot be more than 128 bytes (code 16)', code: -26")
  })
})
