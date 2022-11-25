import { StartOptions, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { MasternodeType, VoteDecision } from '../../../src/category/governance'
import { Testing } from '@defichain/jellyfish-testing'
import { masternode } from '@defichain/jellyfish-api-core'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

class MultiOperatorGovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      `-masternode_operator=${RegTestFoundationKeys[1].operator.address}`,
      `-masternode_operator=${RegTestFoundationKeys[2].operator.address}`
    ]
  }
}

describe('Governance', () => {
  const testing = Testing.create(new MultiOperatorGovernanceMasterNodeRegTestContainer())

  let masternodes: masternode.MasternodeResult<masternode.MasternodeInfo>

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await testing.container.generate(1)

    /**
     * Import the private keys of the masternode_operator in order to be able to mint blocks and vote on proposals.
     * This setup uses the default masternode + two additional masternodes for a total of 3 masternodes.
     */
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[1].owner.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[1].operator.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[2].owner.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[2].operator.privKey)

    masternodes = await testing.rpc.masternode.listMasternodes()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listGovProposalVotes', async () => {
    const data = {
      title: 'A vote of confidence',
      context: '<Git issue url>'
    }
    const proposalId = await testing.rpc.governance.createGovVoc(data) // Creates a vote of confidence on which to vote
    await testing.container.generate(1)

    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.voteGov({ proposalId, masternodeId: id, decision: VoteDecision.YES })
      }
    }
    await testing.container.generate(1)

    const votes = await testing.rpc.governance.listGovProposalVotes(proposalId)
    expect(votes.length).toStrictEqual(3) // The three masternodes should have voted on the proposal
    expect(typeof votes[0].masternodeId).toStrictEqual('string')
    expect(votes[0].masternodeId.length).toStrictEqual(64)
    expect(votes[0].proposalId).toStrictEqual(proposalId)
    expect(votes[0].cycle).toStrictEqual(1)
    expect(votes[0].vote).toStrictEqual('YES')
  })

  it('should listGovProposalVotes with filter masternode=MasternodeType.ALL', async () => {
    const data = {
      title: 'A vote of confidence',
      context: '<Git issue url>'
    }
    const proposalId = await testing.rpc.governance.createGovVoc(data) // Creates a vote of confidence on which to vote
    await testing.container.generate(1)

    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.voteGov({ proposalId, masternodeId: id, decision: VoteDecision.YES })
      }
    }
    await testing.container.generate(1)

    const votes = await testing.rpc.governance.listGovProposalVotes(proposalId, MasternodeType.ALL)
    expect(votes.length).toStrictEqual(3) // The three masternodes should have voted on the proposal
    expect(typeof votes[0].masternodeId).toStrictEqual('string')
    expect(votes[0].masternodeId.length).toStrictEqual(64)
    expect(votes[0].proposalId).toStrictEqual(proposalId)
    expect(votes[0].cycle).toStrictEqual(1)
    expect(votes[0].vote).toStrictEqual('YES')
  })

  it('should listGovProposalVotes with filter on a specific masternodeId', async () => {
    const data = {
      title: 'A vote of confidence',
      context: '<Git issue url>'
    }
    const proposalId = await testing.rpc.governance.createGovVoc(data) // Creates a vote of confidence on which to vote
    let masternodeId = ''

    await testing.container.generate(1)

    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.voteGov({ proposalId, masternodeId: id, decision: VoteDecision.YES })
        masternodeId = id // Uses the last id as masternodeId
      }
    }
    await testing.container.generate(1)

    const votes = await testing.rpc.governance.listGovProposalVotes(proposalId, masternodeId)
    expect(votes.length).toStrictEqual(1)
    expect(votes[0].masternodeId).toStrictEqual(masternodeId)
    expect(votes[0].proposalId).toStrictEqual(proposalId)
    expect(votes[0].cycle).toStrictEqual(1)
    expect(votes[0].vote).toStrictEqual('YES')
  })

  it('should listGovProposalVotes with a given number of cycles', async () => {
    const data = {
      title: 'A vote of confidence',
      context: '<Git issue url>'
    }
    const proposalId = await testing.rpc.governance.createGovVoc(data) // Creates a vote of confidence on which to vote
    let masternodeId = ''

    await testing.container.generate(1)

    const creationHeight = await testing.container.getBlockCount()
    const votingPeriod = 70
    const cycle1 = creationHeight + (votingPeriod - creationHeight % votingPeriod) + votingPeriod

    // cycle 1 vote
    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.voteGov({ proposalId, masternodeId: id, decision: VoteDecision.YES })
        masternodeId = id // Uses the first id as masternodeId
        break // only one masternote vote in first cycle
      }
    }
    await testing.container.generate(1)

    // check total votes for current cycle
    let proposalVotes = await testing.rpc.governance.listGovProposalVotes(proposalId, 'all')
    expect(proposalVotes.length).toStrictEqual(1)
    expect(proposalVotes[0].cycle).toStrictEqual(1)
    expect(proposalVotes[0].vote).toStrictEqual('YES')

    // cycle 2 votes
    await testing.container.generate(cycle1 - await testing.container.getBlockCount())

    const votes = [VoteDecision.YES, VoteDecision.NO, VoteDecision.NO]

    let index = 0
    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.voteGov({ proposalId, masternodeId: id, decision: votes[index] })
        index++ // all masternodes vote in second cycle
      }
    }
    await testing.container.generate(1)

    // check total votes for current cycle
    proposalVotes = await testing.rpc.governance.listGovProposalVotes(proposalId, 'all')
    expect(proposalVotes.length).toStrictEqual(3)
    expect(proposalVotes[0].cycle).toStrictEqual(2)

    // check total votes for a given cycle
    proposalVotes = await testing.rpc.governance.listGovProposalVotes(proposalId, 'all', 1)
    expect(proposalVotes.length).toStrictEqual(1)
    expect(proposalVotes[0].cycle).toStrictEqual(1)

    // check total votes for all cycles
    proposalVotes = await testing.rpc.governance.listGovProposalVotes(proposalId, 'all', -1)
    expect(proposalVotes.length).toStrictEqual(4)

    // check total votes for specific masternode for all cycles
    proposalVotes = await testing.rpc.governance.listGovProposalVotes(proposalId, masternodeId, -1)
    expect(proposalVotes.length).toStrictEqual(2)

    // check votes for specific masternode for a given cycle
    proposalVotes = await testing.rpc.governance.listGovProposalVotes(proposalId, masternodeId, 2)
    expect(proposalVotes.length).toStrictEqual(1)
  })
})
