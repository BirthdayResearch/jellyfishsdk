import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { CreateGovCfp, OP_CODES } from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { governance } from '@defichain/jellyfish-api-core'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('createGovCfp', () => {
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
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createGovCfp', async () => {
    await fundEllipticPair(testing.container, providers.ellipticPair, 3) // Amount needed for cfp creation + fees
    await providers.setupMocks()

    const script = await providers.elliptic.script()
    const createGovCfp: CreateGovCfp = {
      type: 0x01,
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      address: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('8b5401d88a3d4e54fc701663dd99a5ab792af0a4'),
          OP_CODES.OP_EQUAL
        ]
      },
      cycles: 2
    }
    const txn = await builder.governance.createGovCfp(createGovCfp, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_CFP(createGovCfp).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(1)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    const listGovProposals = await testing.rpc.governance.listGovProposals()
    const txid = calculateTxid(txn)

    const proposal = listGovProposals.find(el => el.proposalId === txid)
    expect(proposal).toStrictEqual({
      proposalId: txid,
      title: createGovCfp.title,
      context: createGovCfp.context,
      type: governance.ProposalType.COMMUNITY_FUND_PROPOSAL,
      status: governance.ProposalStatus.VOTING,
      amount: createGovCfp.amount,
      cyclesPaid: 1,
      totalCycles: createGovCfp.cycles,
      finalizeAfter: expect.any(Number),
      payoutAddress: '2N5wvYsWcAWQUed5vfPxopxZtjkqoT8dFM3'
    })
  })

  it('should reject with invalid title length', async () => {
    await fundEllipticPair(testing.container, providers.ellipticPair, 3) // Amount needed for cfp creation + fees
    await providers.setupMocks()

    const script = await providers.elliptic.script()
    const txn = await builder.governance.createGovCfp({
      type: 0x01,
      title: 'X'.repeat(150),
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      address: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('8b5401d88a3d4e54fc701663dd99a5ab792af0a4'),
          OP_CODES.OP_EQUAL
        ]
      },
      cycles: 2
    }, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal title cannot be more than 128 bytes (code 16)', code: -26")
  })
})
