import { DeFiDRpcError, GenesisKeys } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { OP_CODES } from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { GovernanceMasterNodeRegTestContainer } from '../../../jellyfish-api-core/__tests__/category/governance/governance_container'
import { governance } from '@defichain/jellyfish-api-core'
import { TxnBuilderError } from '../../src/txn/txn_builder_error'

describe('createCfp', () => {
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const testing = Testing.create(new GovernanceMasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

    await testing.container.waitForWalletBalanceGTE(11)
    await fundEllipticPair(testing.container, providers.ellipticPair, 50)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should createCfp', async () => {
    const script = await providers.elliptic.script()
    const createCfp = {
      type: 0x01,
      title: 'Testing new community fund proposal',
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
    const txn = await builder.governance.createCfp(createCfp, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_CREATE_CFP(createCfp).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toEqual(1)
    expect(outs[0].scriptPubKey.hex).toEqual(expectedRedeemScript)

    const listProposals = await testing.rpc.governance.listProposals()
    const txid = calculateTxid(txn)

    const proposal = listProposals.find(el => el.proposalId === txid)
    expect(proposal).toStrictEqual({
      proposalId: txid,
      title: createCfp.title,
      type: governance.ProposalType.COMMUNITY_FUND_REQUEST,
      status: governance.ProposalStatus.VOTING,
      amount: createCfp.amount,
      cyclesPaid: 1,
      totalCycles: createCfp.cycles,
      finalizeAfter: expect.any(Number),
      payoutAddress: '2N5wvYsWcAWQUed5vfPxopxZtjkqoT8dFM3'
    })
  })

  it('should reject with invalid type', async () => {
    const script = await providers.elliptic.script()
    const createCfp = {
      type: 0x02,
      title: 'Testing new community fund proposal',
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
    const promise = builder.governance.createCfp(createCfp, script)

    await expect(promise).rejects.toThrow(TxnBuilderError)
    await expect(promise).rejects.toThrow('CreateCfp type should equal 0x01')
  })

  it('should reject with invalid title length', async () => {
    const script = await providers.elliptic.script()
    const createCfp = {
      type: 0x01,
      title: 'X'.repeat(150),
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
    const txn = await builder.governance.createCfp(createCfp, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'CreateCfpTx: proposal title cannot be more than 128 bytes (code 16)', code: -26")
  })
})
