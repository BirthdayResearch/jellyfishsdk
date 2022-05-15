import { StartFlags } from '@defichain/testcontainers'
import { MasternodeType, VoteDecision } from '../../../src/category/governance'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { masternode } from '@defichain/jellyfish-api-core'

describe('Governance', () => {
  const tGroup = TestingGroup.create(4)
  const greatWorldHeight = 101

  let masternodes: masternode.MasternodeResult<masternode.MasternodeInfo>

  beforeAll(async () => {
    const startFlags: StartFlags[] = [{ name: 'greatworldheight', value: greatWorldHeight }]
    await tGroup.start({ startFlags: startFlags })
    await tGroup.get(0).generate(100)
    await tGroup.get(3).generate(1)
    await tGroup.waitForSync()

    masternodes = await tGroup.get(1).rpc.masternode.listMasternodes()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should listVotes', async () => {
    const proposalId = await tGroup.get(1).rpc.governance.createVoc('A vote of confidence') // Creates a vote of confidence on which to vote
    await tGroup.get(1).container.generate(1)

    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await tGroup.get(1).container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await tGroup.get(1).rpc.governance.vote({ proposalId, masternodeId: id, decision: VoteDecision.YES })
      }
    }
    await tGroup.get(1).container.generate(1)

    const votes = await tGroup.get(1).rpc.governance.listVotes(proposalId)
    expect(votes.length).toStrictEqual(1)
    expect(typeof votes[0].masternodeId).toStrictEqual('string')
    expect(votes[0].masternodeId.length).toStrictEqual(64)
    expect(votes[0].proposalId).toStrictEqual(proposalId)
    expect(votes[0].cycle).toStrictEqual(1)
    expect(votes[0].vote).toStrictEqual('YES')
  })

  it('should listVotes with filter masternode=MasternodeType.ALL', async () => {
    const proposalId = await tGroup.get(1).rpc.governance.createVoc('A vote of confidence') // Creates a vote of confidence on which to vote
    await tGroup.get(1).container.generate(1)

    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await tGroup.get(1).container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await tGroup.get(1).rpc.governance.vote({ proposalId, masternodeId: id, decision: VoteDecision.YES })
      }
    }
    await tGroup.get(1).container.generate(1)

    const votes = await tGroup.get(1).rpc.governance.listVotes(proposalId, MasternodeType.ALL)
    expect(votes.length).toStrictEqual(1)
    expect(typeof votes[0].masternodeId).toStrictEqual('string')
    expect(votes[0].masternodeId.length).toStrictEqual(64)
    expect(votes[0].proposalId).toStrictEqual(proposalId)
    expect(votes[0].cycle).toStrictEqual(1)
    expect(votes[0].vote).toStrictEqual('YES')
  })

  it('should listVotes with filter on a specific masternodeId', async () => {
    const proposalId = await tGroup.get(1).rpc.governance.createVoc('A vote of confidence') // Creates a vote of confidence on which to vote
    let masternodeId = ''

    await tGroup.get(1).container.generate(1)

    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await tGroup.get(1).container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await tGroup.get(1).rpc.governance.vote({ proposalId, masternodeId: id, decision: VoteDecision.YES })
        masternodeId = id // Uses the last id as masternodeId
      }
    }
    await tGroup.get(1).container.generate(1)

    const votes = await tGroup.get(1).rpc.governance.listVotes(proposalId, masternodeId)
    expect(votes.length).toStrictEqual(1)
    expect(votes[0].masternodeId).toStrictEqual(masternodeId)
    expect(votes[0].proposalId).toStrictEqual(proposalId)
    expect(votes[0].cycle).toStrictEqual(1)
    expect(votes[0].vote).toStrictEqual('YES')
  })
})
