import { DeFiDRpcError } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { CreateCfp, OP_CODES } from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { GovernanceMasterNodeRegTestContainer } from '../../../jellyfish-api-core/__tests__/category/governance/governance_container'
import { governance } from '@defichain/jellyfish-api-core'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('createCfp', () => {
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
    await fundEllipticPair(testing.container, providers.ellipticPair, 3) // Amount needed for two cfp creation + fees
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
      nAmount: new BigNumber(100),
      address: {
        stack: [
          OP_CODES.OP_HASH160,
          OP_CODES.OP_PUSHDATA_HEX_LE('8b5401d88a3d4e54fc701663dd99a5ab792af0a4'),
          OP_CODES.OP_EQUAL
        ]
      },
      nCycles: 2,
      options: 0x00
    }
    const txn = await builder.governance.createCfp(createCfp, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_CFP(createCfp).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(1)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)

    const listProposals = await testing.rpc.governance.listProposals()
    const txid = calculateTxid(txn)

    const proposal = listProposals.find(el => el.proposalId === txid)
    expect(proposal).toStrictEqual({
      proposalId: txid,
      title: createCfp.title,
      context: createCfp.context,
      contexthash: createCfp.contexthash,
      type: governance.ProposalType.COMMUNITY_FUND_REQUEST,
      status: governance.ProposalStatus.VOTING,
      amount: createCfp.nAmount,
      nextCycle: 1,
      totalCycles: createCfp.nCycles,
      finalizeAfter: expect.any(Number),
      payoutAddress: '2N5wvYsWcAWQUed5vfPxopxZtjkqoT8dFM3'
    })
  })

  it('should reject with invalid title length', async () => {
    const script = await providers.elliptic.script()
    const txn = await builder.governance.createCfp({
      type: 0x01,
      title: 'X'.repeat(150),
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(100),
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

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal title cannot be more than 128 bytes (code 16)', code: -26")
  })
})
