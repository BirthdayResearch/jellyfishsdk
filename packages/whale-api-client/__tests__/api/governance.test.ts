import { ListProposalsStatus, ListProposalsType, VoteDecision } from '@defichain/jellyfish-api-core/dist/category/governance'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers/dist/index'
import { GovernanceProposalStatus, GovernanceProposalType, ProposalMasternodeType, ProposalVoteResultType } from '@defichain/whale-api-client/dist/api/governance'
import BigNumber from 'bignumber.js'
import { WhaleApiException } from '../../src'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'

class MultiOperatorGovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      `-masternode_operator=${RegTestFoundationKeys[1].operator.address}`,
      `-masternode_operator=${RegTestFoundationKeys[2].operator.address}`
    ]
  }
}

const container = new MultiOperatorGovernanceMasterNodeRegTestContainer()
const service = new StubService(container)
const client = new StubWhaleApiClient(service)
let cfpProposalId: string
let vocProposalId: string
let payoutAddress: string
let testing: Testing

describe('governance - listProposals and getProposal', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()
    testing = Testing.create(container)
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await testing.generate(1)

    // Create 1 CFP + 1 VOC
    payoutAddress = await testing.generateAddress()
    cfpProposalId = await testing.rpc.governance.createGovCfp({
      title: 'CFP proposal',
      context: 'github',
      amount: new BigNumber(1.23),
      payoutAddress: payoutAddress,
      cycles: 2
    })
    await testing.generate(1)

    vocProposalId = await testing.rpc.governance.createGovVoc({
      title: 'VOC proposal',
      context: 'github'
    })
    await testing.generate(1)
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  it('should listGovProposals', async () => {
    const result = await client.governance.listGovProposals()
    const cfpResult = result.find(proposal => proposal.type === GovernanceProposalType.COMMUNITY_FUND_PROPOSAL)
    const vocResult = result.find(proposal => proposal.type === GovernanceProposalType.VOTE_OF_CONFIDENCE)
    expect(cfpResult).toStrictEqual({
      proposalId: cfpProposalId,
      creationHeight: expect.any(Number),
      title: 'CFP proposal',
      context: 'github',
      contextHash: '',
      status: GovernanceProposalStatus.VOTING,
      type: GovernanceProposalType.COMMUNITY_FUND_PROPOSAL,
      amount: new BigNumber(1.23).toFixed(8),
      payoutAddress: payoutAddress,
      currentCycle: 1,
      totalCycles: 2,
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      votingPeriod: expect.any(Number),
      quorum: expect.any(String),
      approvalThreshold: expect.any(String),
      fee: expect.any(Number)
    })
    expect(vocResult).toStrictEqual({
      proposalId: vocProposalId,
      creationHeight: expect.any(Number),
      title: 'VOC proposal',
      context: 'github',
      contextHash: '',
      status: GovernanceProposalStatus.VOTING,
      type: GovernanceProposalType.VOTE_OF_CONFIDENCE,
      currentCycle: 1,
      totalCycles: 1,
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      votingPeriod: expect.any(Number),
      quorum: expect.any(String),
      approvalThreshold: expect.any(String),
      fee: expect.any(Number)
    })
  })

  it('should listProposals with size', async () => {
    const result = await client.governance.listGovProposals(undefined, undefined, undefined, 1)
    expect(result.length).toStrictEqual(1)
  })

  it('should listProposals with status', async () => {
    const result = await client.governance.listGovProposals(ListProposalsStatus.VOTING)
    expect(result.length).toStrictEqual(2)
  })

  it('should listProposals with type', async () => {
    const result = await client.governance.listGovProposals(undefined, ListProposalsType.CFP)
    expect(result.length).toStrictEqual(1)
  })

  it('should listProposals with cycle', async () => {
    const result = await client.governance.listGovProposals(undefined, undefined, 0)
    expect(result.length).toStrictEqual(2)
  })

  it('should listProposals with status and type', async () => {
    const result = await client.governance.listGovProposals(ListProposalsStatus.VOTING, ListProposalsType.CFP)
    expect(result.length).toStrictEqual(1)
  })

  it('should listProposals with status, type and cycle', async () => {
    const result = await client.governance.listGovProposals(ListProposalsStatus.VOTING, ListProposalsType.CFP, 0)
    expect(result.length).toStrictEqual(1)
  })

  it('should listProposals with pagination', async () => {
    const resultPage1 = await client.governance.listGovProposals(undefined, undefined, undefined, 1)
    expect(resultPage1.length).toStrictEqual(1)
    const resultPage2 = await client.governance.listGovProposals(undefined, undefined, undefined, 1, resultPage1.nextToken)
    expect(resultPage2.length).toStrictEqual(1)
    expect(resultPage1[0].proposalId).not.toStrictEqual(resultPage2[0].proposalId)
  })

  it('should listProposals with all record when all flag is true', async () => {
    const result = await client.governance.listGovProposals(undefined, undefined, undefined, undefined, undefined, true)
    expect(result.length).toStrictEqual(2)
  })

  it('should listProposals with status and pagination', async () => {
    const resultPage1 = await client.governance.listGovProposals(ListProposalsStatus.VOTING, undefined, undefined, 1)
    expect(resultPage1.length).toStrictEqual(1)
    expect(resultPage1[0].status).toStrictEqual(GovernanceProposalStatus.VOTING)
    const resultPage2 = await client.governance.listGovProposals(ListProposalsStatus.VOTING, undefined, undefined, 1, resultPage1.nextToken)
    expect(resultPage2.length).toStrictEqual(1)
    expect(resultPage2[0].status).toStrictEqual(GovernanceProposalStatus.VOTING)
  })

  // TODO: remove skip when blockchain fixes issue where start is ignored when non-all status is not passed
  it.skip('should listProposals with type and pagination', async () => {
    const resultPage1 = await client.governance.listGovProposals(undefined, ListProposalsType.CFP, undefined, 1)
    expect(resultPage1.length).toStrictEqual(1)
    expect(resultPage1[0].type).toStrictEqual(GovernanceProposalType.COMMUNITY_FUND_PROPOSAL)
    const resultPage2 = await client.governance.listGovProposals(undefined, ListProposalsType.CFP, undefined, 1, resultPage1.nextToken)
    expect(resultPage2.length).toStrictEqual(0)
  })

  it('should listProposals with status, type and pagination', async () => {
    const resultPage1 = await client.governance.listGovProposals(ListProposalsStatus.VOTING, ListProposalsType.CFP, undefined, 1)
    expect(resultPage1.length).toStrictEqual(1)
    expect(resultPage1[0].status).toStrictEqual(GovernanceProposalStatus.VOTING)
    expect(resultPage1[0].type).toStrictEqual(GovernanceProposalType.COMMUNITY_FUND_PROPOSAL)
    const resultPage2 = await client.governance.listGovProposals(ListProposalsStatus.VOTING, ListProposalsType.CFP, undefined, 1, resultPage1.nextToken)
    expect(resultPage2.length).toStrictEqual(0)
  })

  it('should listProposals with error when using invalid status', async () => {
    try {
      // To skip typescript validation in order to assert invalid query parameter
      // @ts-expect-error
      await client.governance.listGovProposals('123')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'Invalid query parameter value for status. See the acceptable values: voting, rejected, completed, all',
        url: '/v0.0/regtest/governance/proposals?size=30&status=123&type=all&cycle=0&all=false'
      })
    }
  })

  it('should listProposals with error when using invalid type', async () => {
    try {
      // To skip typescript validation in order to assert invalid query parameter
      // @ts-expect-error
      await client.governance.listGovProposals(undefined, '123')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'Invalid query parameter value for type. See the acceptable values: cfp, voc, all',
        url: '/v0.0/regtest/governance/proposals?size=30&status=all&type=123&cycle=0&all=false'
      })
    }
  })

  // Get single related tests
  it('should getProposal for CFP', async () => {
    const result = await client.governance.getGovProposal(cfpProposalId)
    expect(result).toStrictEqual({
      proposalId: cfpProposalId,
      creationHeight: expect.any(Number),
      title: 'CFP proposal',
      context: 'github',
      contextHash: '',
      status: GovernanceProposalStatus.VOTING,
      type: GovernanceProposalType.COMMUNITY_FUND_PROPOSAL,
      amount: new BigNumber(1.23).toFixed(8),
      payoutAddress: payoutAddress,
      currentCycle: 1,
      totalCycles: 2,
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      votingPeriod: expect.any(Number),
      quorum: expect.any(String),
      approvalThreshold: expect.any(String),
      fee: expect.any(Number)
    })
  })

  it('should getProposal for VOC', async () => {
    const result = await client.governance.getGovProposal(vocProposalId)
    expect(result).toStrictEqual({
      proposalId: vocProposalId,
      creationHeight: 104,
      title: 'VOC proposal',
      context: 'github',
      contextHash: '',
      status: GovernanceProposalStatus.VOTING,
      type: GovernanceProposalType.VOTE_OF_CONFIDENCE,
      currentCycle: 1,
      totalCycles: 1,
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      votingPeriod: expect.any(Number),
      quorum: expect.any(String),
      approvalThreshold: expect.any(String),
      fee: expect.any(Number)
    })
  })

  it('should getProposal with error when using non-existent proposal ID', async () => {
    try {
      await client.governance.getGovProposal('123')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find proposal',
        url: '/v0.0/regtest/governance/proposals/123'
      })
    }
  })
})

describe('governance - listProposalVotes', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()
    testing = Testing.create(container)
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await testing.generate(1)

    /**
     * Import the private keys of the masternode_operator in order to be able to mint blocks and vote on proposals.
     * This setup uses the default masternode + two additional masternodes for a total of 3 masternodes.
     */
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[1].owner.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[1].operator.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[2].owner.privKey)
    await testing.rpc.wallet.importPrivKey(RegTestFoundationKeys[2].operator.privKey)

    // Create 1 CFP + 1 VOC
    payoutAddress = await testing.generateAddress()
    cfpProposalId = await testing.rpc.governance.createGovCfp({
      title: 'CFP proposal',
      context: 'github',
      amount: new BigNumber(1.23),
      payoutAddress: payoutAddress,
      cycles: 2
    })
    await testing.generate(1)

    vocProposalId = await testing.rpc.governance.createGovVoc({
      title: 'VOC proposal',
      context: 'github'
    })
    await testing.generate(1)

    // Vote on CFP
    await testing.rpc.governance.voteGov({
      proposalId: cfpProposalId,
      masternodeId: await getVotableMasternodeId(),
      decision: VoteDecision.YES
    })
    await testing.generate(1)

    // Expires cycle 1
    const creationHeight = await testing.rpc.governance.getGovProposal(cfpProposalId).then(proposal => proposal.creationHeight)
    const votingPeriod = 70
    const cycle1 = creationHeight + (votingPeriod - creationHeight % votingPeriod) + votingPeriod
    await testing.generate(cycle1 - await testing.container.getBlockCount())

    // Vote on cycle 2
    const masternodes = await testing.rpc.masternode.listMasternodes()
    const votes = [VoteDecision.YES, VoteDecision.NO, VoteDecision.NEUTRAL]
    let index = 0
    for (const [id, data] of Object.entries(masternodes)) {
      if (data.operatorIsMine) {
        await testing.container.generate(1, data.operatorAuthAddress) // Generate a block to operatorAuthAddress to be allowed to vote on proposal
        await testing.rpc.governance.voteGov({
          proposalId: cfpProposalId,
          masternodeId: id,
          decision: votes[index]
        })
        index++ // all masternodes vote in second cycle
      }
    }
    await testing.generate(1)
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  it('should listProposalVotes', async () => {
    const result = await client.governance.listGovProposalVotes(cfpProposalId)
    const yesVote = result.find(vote => vote.vote === ProposalVoteResultType.YES)
    const noVote = result.find(vote => vote.vote === ProposalVoteResultType.NO)
    const neutralVote = result.find(vote => vote.vote === ProposalVoteResultType.NEUTRAL)
    expect(result.length).toStrictEqual(3)
    expect(yesVote).toStrictEqual({
      proposalId: cfpProposalId,
      masternodeId: expect.any(String),
      cycle: 2,
      vote: ProposalVoteResultType.YES
    })
    expect(noVote).toStrictEqual({
      proposalId: cfpProposalId,
      masternodeId: expect.any(String),
      cycle: 2,
      vote: ProposalVoteResultType.NO
    })
    expect(neutralVote).toStrictEqual({
      proposalId: cfpProposalId,
      masternodeId: expect.any(String),
      cycle: 2,
      vote: ProposalVoteResultType.NEUTRAL
    })
  })

  it('should listProposalVotes with cycle', async () => {
    const result = await client.governance.listGovProposalVotes(cfpProposalId, undefined, 2)
    expect(result.length).toStrictEqual(3)
  })

  it('should listProposalVotes with all records when all flag is true', async () => {
    const result = await client.governance.listGovProposalVotes(cfpProposalId, undefined, undefined, undefined, undefined, true)
    expect(result.length).toStrictEqual(3)
  })

  it('should listProposalVotes with all masternodes', async () => {
    const result = await client.governance.listGovProposalVotes(cfpProposalId, ProposalMasternodeType.ALL)
    expect(result.length).toStrictEqual(3)
  })

  it('should listProposalVotes with all masternodes and cycle', async () => {
    const result = await client.governance.listGovProposalVotes(cfpProposalId, ProposalMasternodeType.ALL, -1)
    expect(result.length).toStrictEqual(4)

    const result2 = await client.governance.listGovProposalVotes(cfpProposalId, ProposalMasternodeType.ALL, 0)
    expect(result2.length).toStrictEqual(3)
  })

  it('should listProposalVotes with all masternodes, cycle and pagination', async () => {
    const resultPage1 = await client.governance.listGovProposalVotes(cfpProposalId, ProposalMasternodeType.ALL, 2, 2)
    expect(resultPage1.length).toStrictEqual(2)
    const resultPage2 = await client.governance.listGovProposalVotes(cfpProposalId, ProposalMasternodeType.ALL, 2, 2, resultPage1.nextToken)
    expect(resultPage2.length).toStrictEqual(1)
  })

  it('should listProposalVotes with error when using non-existent proposal ID', async () => {
    try {
      await client.governance.listGovProposalVotes('123')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find proposal',
        url: '/v0.0/regtest/governance/proposals/123/votes?size=30&masternode=mine&cycle=0&all=false'
      })
    }
  })
})

/**
 * Return masternode that mined at least one block to vote on proposal
 */
async function getVotableMasternodeId (): Promise<string> {
  const masternodes = await testing.rpc.masternode.listMasternodes()
  let masternodeId = ''
  for (const id in masternodes) {
    const masternode = masternodes[id]
    if (masternode.mintedBlocks > 0) {
      masternodeId = id
      break
    }
  }
  if (masternodeId === '') {
    throw new Error('No masternode is available to vote')
  }
  return masternodeId
}
