import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'
import { RpcApiError } from '../../../src'
import { ProposalStatus, ProposalType, VoteDecision } from '../../../src/category/governance'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { Testing } from '@defichain/jellyfish-testing'
import { masternode } from '@defichain/jellyfish-api-core'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Governance', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getGovProposal', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress(),
      cycles: 2
    }
    const proposalId = await client.governance.createGovCfp(data)
    await container.generate(1)

    expect(typeof proposalId).toStrictEqual('string')

    const proposal = await client.governance.getGovProposal(proposalId)
    expect(proposal).toStrictEqual({
      title: data.title,
      context: data.context,
      contextHash: '',
      type: ProposalType.COMMUNITY_FUND_PROPOSAL,
      status: ProposalStatus.VOTING,
      amount: new BigNumber(data.amount),
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: 1,
      totalCycles: data.cycles,
      payoutAddress: data.payoutAddress,
      proposalId: proposalId,
      approvalThreshold: expect.any(String),
      fee: expect.any(Number),
      quorum: expect.any(String),
      votingPeriod: expect.any(Number)
    })
  })

  it('should throw error if proposalId is invalid', async () => {
    const proposalId = 'e4087598bb396cd3a94429843453e67e68b1c7625a99b0b4c505abcc4506697b'
    const promise = client.governance.getGovProposal(proposalId)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Proposal <${proposalId}> does not exist', code: -8, method: getgovproposal`)
  })
})

describe('Governance with multiple masternodes voting', () => {
  class MultiOperatorGovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
    protected getCmd (opts: StartOptions): string[] {
      return [
        ...super.getCmd(opts),
        `-masternode_operator=${RegTestFoundationKeys[1].operator.address}`,
        `-masternode_operator=${RegTestFoundationKeys[2].operator.address}`,
        `-masternode_operator=${RegTestFoundationKeys[3].operator.address}`
      ]
    }
  }

  const testing = Testing.create(new MultiOperatorGovernanceMasterNodeRegTestContainer())

  let masternodes: masternode.MasternodeResult<masternode.MasternodeInfo>

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await testing.container.generate(1)

    /**
     * Import the private keys of the masternode_operator in order to be able to mint blocks and vote on proposals.
     * This setup uses the default masternode + three additional masternodes for a total of 4 masternodes.
     */
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[1].owner.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[1].operator.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[2].owner.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[2].operator.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[3].owner.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[3].operator.privKey)

    masternodes = await testing.rpc.masternode.listMasternodes()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getGovProposal with vote information - above threshold', async () => {
    const creationHeight = await testing.container.getBlockCount()
    const votingPeriod = 70
    const cycle1 = creationHeight + (votingPeriod - creationHeight % votingPeriod) + votingPeriod

    const data = {
      title: 'A vote of confidence',
      context: '<Git issue url>'
    }
    const proposalId = await testing.rpc.governance.createGovVoc(data)

    const votes = [VoteDecision.YES, VoteDecision.YES, VoteDecision.YES, VoteDecision.NO] // above threshold

    let index = 0
    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.voteGov({ proposalId, masternodeId: id, decision: votes[index] })
        index++
      }
    }
    await testing.container.generate(1)

    const proposal = await testing.rpc.governance.getGovProposal(proposalId)
    expect(proposal).toStrictEqual({
      title: data.title,
      context: data.context,
      contextHash: '',
      type: ProposalType.VOTE_OF_CONFIDENCE,
      status: ProposalStatus.VOTING,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: 1,
      totalCycles: 1,
      proposalId: proposalId,
      approvalThreshold: '66.67%',
      quorum: '1.00%',
      fee: expect.any(Number),
      votingPeriod: expect.any(Number),
      votesPossible: 4,
      votesPresent: 4,
      votesPresentPct: '100.00%',
      votesYes: 3,
      votesYesPct: '75.00%'
    })

    await testing.container.generate(cycle1 - await testing.container.getBlockCount())
    const proposalAfter = await testing.rpc.governance.getGovProposal(proposalId)
    expect(proposalAfter).toStrictEqual({
      title: data.title,
      context: data.context,
      contextHash: '',
      type: ProposalType.VOTE_OF_CONFIDENCE,
      status: ProposalStatus.COMPLETED,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: 1,
      totalCycles: 1,
      proposalId: proposalId,
      approvalThreshold: '66.67%',
      quorum: '1.00%',
      fee: expect.any(Number),
      votingPeriod: expect.any(Number),
      votesPossible: 4,
      votesPresent: 4,
      votesPresentPct: '100.00%',
      votesYes: 3,
      votesYesPct: '75.00%'
    })
  })

  it('should getGovProposal with vote information - below threshold', async () => {
    const creationHeight = await testing.container.getBlockCount()
    const votingPeriod = 70
    const cycle1 = creationHeight + (votingPeriod - creationHeight % votingPeriod) + votingPeriod

    const data = {
      title: 'A vote of confidence 2',
      context: '<Git issue url>'
    }
    const proposalId = await testing.rpc.governance.createGovVoc(data)
    await testing.container.generate(1)

    const votes = [VoteDecision.YES, VoteDecision.YES, VoteDecision.NO, VoteDecision.NO] // below threshold

    let index = 0
    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.voteGov({ proposalId, masternodeId: id, decision: votes[index] })
        index++
      }
    }
    await testing.container.generate(1)

    const proposal = await testing.rpc.governance.getGovProposal(proposalId)
    expect(proposal).toStrictEqual({
      title: data.title,
      context: data.context,
      contextHash: '',
      type: ProposalType.VOTE_OF_CONFIDENCE,
      status: ProposalStatus.VOTING,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: 1,
      totalCycles: 1,
      proposalId: proposalId,
      approvalThreshold: '66.67%',
      quorum: '1.00%',
      fee: expect.any(Number),
      votingPeriod: expect.any(Number),
      votesPossible: 4,
      votesPresent: 4,
      votesPresentPct: '100.00%',
      votesYes: 2,
      votesYesPct: '50.00%'
    })

    await testing.container.generate(cycle1 - await testing.container.getBlockCount())
    const proposalAfter = await testing.rpc.governance.getGovProposal(proposalId)
    expect(proposalAfter).toStrictEqual({
      title: data.title,
      context: data.context,
      contextHash: '',
      type: ProposalType.VOTE_OF_CONFIDENCE,
      status: ProposalStatus.REJECTED,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: 1,
      totalCycles: 1,
      proposalId: proposalId,
      approvalThreshold: '66.67%',
      quorum: '1.00%',
      fee: expect.any(Number),
      votingPeriod: expect.any(Number),
      votesPossible: 4,
      votesPresent: 4,
      votesPresentPct: '100.00%',
      votesYes: 2,
      votesYesPct: '50.00%'
    })
  })

  it('should getGovProposal with vote information - multi cycle', async () => {
    const address = await testing.container.getNewAddress()
    const data = {
      title: 'Testing community fund proposal',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: address,
      cycles: 2
    }
    const proposalId = await testing.rpc.governance.createGovCfp(data)
    await testing.container.generate(1)

    const creationHeight = await testing.container.getBlockCount()
    const votingPeriod = 70
    const cycle1 = creationHeight + (votingPeriod - creationHeight % votingPeriod) + votingPeriod

    // cycle 1 vote
    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.voteGov({ proposalId, masternodeId: id, decision: VoteDecision.YES })
      }
    }
    await testing.container.generate(1)

    const proposal = await testing.rpc.governance.getGovProposal(proposalId)
    expect(proposal).toStrictEqual({
      title: data.title,
      context: data.context,
      contextHash: '',
      type: ProposalType.COMMUNITY_FUND_PROPOSAL,
      status: ProposalStatus.VOTING,
      amount: new BigNumber(data.amount),
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: 1,
      totalCycles: 2,
      payoutAddress: address,
      proposalId: proposalId,
      approvalThreshold: '50.00%',
      quorum: '1.00%',
      fee: expect.any(Number),
      votingPeriod: expect.any(Number),
      votesPossible: 4,
      votesPresent: 4,
      votesPresentPct: '100.00%',
      votesYes: 4,
      votesYesPct: '100.00%'
    })

    // cycle 2 votes
    await testing.container.generate(cycle1 - await testing.container.getBlockCount())
    const c2creationHeight = await testing.container.getBlockCount()
    const cycle2 = c2creationHeight + (votingPeriod - c2creationHeight % votingPeriod) + votingPeriod

    const votes = [VoteDecision.YES, VoteDecision.NO, VoteDecision.NO, VoteDecision.NO] // below threshold

    let index = 0
    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.rpc.governance.voteGov({
          proposalId,
          masternodeId: id,
          decision: votes[index]
        })
        index++
      }
    }
    await testing.container.generate(1)

    const proposal2 = await testing.rpc.governance.getGovProposal(proposalId)
    expect(proposal2).toStrictEqual({
      title: data.title,
      context: data.context,
      contextHash: '',
      type: ProposalType.COMMUNITY_FUND_PROPOSAL,
      status: ProposalStatus.VOTING,
      amount: new BigNumber(data.amount),
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: 2,
      totalCycles: 2,
      payoutAddress: address,
      proposalId: proposalId,
      approvalThreshold: '50.00%',
      quorum: '1.00%',
      fee: expect.any(Number),
      votingPeriod: expect.any(Number),
      votesPossible: 4,
      votesPresent: 4,
      votesPresentPct: '100.00%',
      votesYes: 1,
      votesYesPct: '25.00%'
    })

    await testing.container.generate(cycle2 - await testing.container.getBlockCount())
    const proposal2After = await testing.rpc.governance.getGovProposal(proposalId)
    expect(proposal2After).toStrictEqual({
      title: data.title,
      context: data.context,
      contextHash: '',
      type: ProposalType.COMMUNITY_FUND_PROPOSAL,
      status: ProposalStatus.REJECTED,
      amount: new BigNumber(data.amount),
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: 2,
      totalCycles: 2,
      payoutAddress: address,
      proposalId: proposalId,
      approvalThreshold: '50.00%',
      quorum: '1.00%',
      fee: expect.any(Number),
      votingPeriod: expect.any(Number),
      votesPossible: 4,
      votesPresent: 4,
      votesPresentPct: '100.00%',
      votesYes: 1,
      votesYesPct: '25.00%'
    })
  })
})
