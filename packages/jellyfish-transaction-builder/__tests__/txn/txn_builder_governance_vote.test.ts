import { GenesisKeys } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { GovernanceMasterNodeRegTestContainer } from '../../../jellyfish-api-core/__tests__/category/governance/governance_container'
import { governance } from '@defichain/jellyfish-api-core'

describe('vote', () => {
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const testing = Testing.create(new GovernanceMasterNodeRegTestContainer())

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey)) // set it to container default
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

    // await providers.randomizeEllipticPair()
    await testing.container.waitForWalletBalanceGTE(12)
    await fundEllipticPair(testing.container, providers.ellipticPair, 50)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should vote', async () => {
    const script = await providers.elliptic.script()
    const createVocTxn = await builder.governance.createCfp({
      type: 0x01,
      title: 'community fund proposal',
      amount: new BigNumber(10),
      address: script,
      cycles: 2
    }, script)

    const proposalId = calculateTxid(createVocTxn)
    await sendTransaction(testing.container, createVocTxn)

    const masternodes = await testing.rpc.masternode.listMasternodes()
    let masternodeId = ''
    for (const id in masternodes) {
      const masternode = masternodes[id]
      if (masternode.mintedBlocks > 0) { // Find masternode that mined at least one block to vote on proposal
        masternodeId = id
      }
    }

    const txid = await testing.rpc.governance.vote({ proposalId, masternodeId, decision: governance.VoteDecision.YES }) // This one goes through

    await testing.container.generate(1)
    console.log('txid : ', txid)

    const vote = {
      voteDecision: 0x01,
      proposalId,
      masternodeId
    }
    const txn = await builder.governance.vote(vote, script)
    await sendTransaction(testing.container, txn) // DeFiDRpcError: 'VoteTx: tx must have at least one input from the owner (code 16)', code: -26
  })
})
