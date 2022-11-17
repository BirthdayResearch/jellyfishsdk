import { DeFiDRpcError } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { CreateVoc, OP_CODES } from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { GovernanceMasterNodeRegTestContainer } from '../../../jellyfish-api-core/__tests__/category/governance/governance_container'
import { governance } from '@defichain/jellyfish-api-core'
import { TxnBuilderError } from '../../src/txn/txn_builder_error'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('createVoc', () => {
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const testing = Testing.create(new GovernanceMasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.container.waitForWalletBalanceGTE(11)
    await fundEllipticPair(testing.container, providers.ellipticPair, 11) // Amount needed for two createVoc creation + fees
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createVoc', async () => {
    const script = await providers.elliptic.script()
    const createVoc: CreateVoc = {
      type: 0x02,
      title: ' a vote of confidence',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(0),
      address: {
        stack: []
      },
      nCycles: 2,
      options: 0x00
    }
    const txn = await builder.governance.createVoc(createVoc, script)
    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_VOC(createVoc).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(5)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    const listProposals = await testing.rpc.container.call('listgovproposals')
    const txid = calculateTxid(txn)

    const proposal = listProposals.find((el: governance.ProposalInfo) => el.proposalId === txid)
    expect(proposal).toStrictEqual({
      proposalId: txid,
      title: createVoc.title,
      context: createVoc.context,
      contexthash: createVoc.contexthash,
      type: governance.ProposalType.VOTE_OF_CONFIDENCE,
      status: governance.ProposalStatus.VOTING,
      amount: createVoc.nAmount.toNumber(),
      nextCycle: 1,
      totalCycles: createVoc.nCycles,
      finalizeAfter: expect.any(Number),
      payoutAddress: ''
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
      nCycles: 2,
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
      nCycles: 2,
      options: 0x00
    }, script)

    await expect(promise).rejects.toThrow(TxnBuilderError)
    await expect(promise).rejects.toThrow('CreateVoc address stack should be empty')
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
      nCycles: 2,
      options: 0x00
    }, script)
    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateVocTx: proposal title cannot be more than 128 bytes (code 16)', code: -26")
  })
})
