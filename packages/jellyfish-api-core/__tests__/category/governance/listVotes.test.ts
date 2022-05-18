import { GenesisKeys, StartOptions } from '@defichain/testcontainers'
import { MasternodeType, VoteDecision } from '../../../src/category/governance'
import { GovernanceMasterNodeRegTestContainer } from './governance_container'
import { Testing } from '@defichain/jellyfish-testing'
import { masternode } from '@defichain/jellyfish-api-core'

class MultiOperatorGovernanceMasterNodeRegTestContainer extends GovernanceMasterNodeRegTestContainer {
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      `-masternode_operator=${GenesisKeys[1].operator.address}`,
      `-masternode_operator=${GenesisKeys[2].operator.address}`
    ]
  }
}

describe('Governance', () => {
  const testing = Testing.create(new MultiOperatorGovernanceMasterNodeRegTestContainer())

  let masternodes: masternode.MasternodeResult<masternode.MasternodeInfo>

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    /**
     * Import the private keys of the masternode_operator in order to be able to mint blocks and vote on proposals.
     * This setup uses the default masternode + two additional masternodes for a total of 3 masternodes.
     */
    await testing.rpc.wallet.importPrivKey(GenesisKeys[1].owner.privKey)
    await testing.rpc.wallet.importPrivKey(GenesisKeys[1].operator.privKey)
    await testing.rpc.wallet.importPrivKey(GenesisKeys[2].owner.privKey)
    await testing.rpc.wallet.importPrivKey(GenesisKeys[2].operator.privKey)

    masternodes = await testing.rpc.masternode.listMasternodes()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listVotes', async () => {
    const proposalId = await testing.rpc.governance.createVoc('A vote of confidence') // Creates a vote of confidence on which to vote
    await testing.container.generate(1)

    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.vote({ proposalId, masternodeId: id, decision: VoteDecision.YES })
      }
    }
    await testing.container.generate(1)

    const votes = await testing.rpc.governance.listVotes(proposalId)
    expect(votes.length).toStrictEqual(3) // The three masternodes should have voted on the proposal
    expect(typeof votes[0].masternodeId).toStrictEqual('string')
    expect(votes[0].masternodeId.length).toStrictEqual(64)
    expect(votes[0].proposalId).toStrictEqual(proposalId)
    expect(votes[0].cycle).toStrictEqual(1)
    expect(votes[0].vote).toStrictEqual('YES')
  })

  it('should listVotes with filter masternode=MasternodeType.ALL', async () => {
    const proposalId = await testing.rpc.governance.createVoc('A vote of confidence') // Creates a vote of confidence on which to vote
    await testing.container.generate(1)

    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.vote({ proposalId, masternodeId: id, decision: VoteDecision.YES })
      }
    }
    await testing.container.generate(1)

    const votes = await testing.rpc.governance.listVotes(proposalId, MasternodeType.ALL)
    expect(votes.length).toStrictEqual(3) // The three masternodes should have voted on the proposal
    expect(typeof votes[0].masternodeId).toStrictEqual('string')
    expect(votes[0].masternodeId.length).toStrictEqual(64)
    expect(votes[0].proposalId).toStrictEqual(proposalId)
    expect(votes[0].cycle).toStrictEqual(1)
    expect(votes[0].vote).toStrictEqual('YES')
  })

  it('should listVotes with filter on a specific masternodeId', async () => {
    const proposalId = await testing.rpc.governance.createVoc('A vote of confidence') // Creates a vote of confidence on which to vote
    let masternodeId = ''

    await testing.container.generate(1)

    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.vote({ proposalId, masternodeId: id, decision: VoteDecision.YES })
        masternodeId = id // Uses the last id as masternodeId
      }
    }
    await testing.container.generate(1)

    const votes = await testing.rpc.governance.listVotes(proposalId, masternodeId)
    expect(votes.length).toStrictEqual(1)
    expect(votes[0].masternodeId).toStrictEqual(masternodeId)
    expect(votes[0].proposalId).toStrictEqual(proposalId)
    expect(votes[0].cycle).toStrictEqual(1)
    expect(votes[0].vote).toStrictEqual('YES')
  })
})
