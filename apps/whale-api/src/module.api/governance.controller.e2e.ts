import { ListProposalsStatus, ListProposalsType, VoteDecision } from '@defichain/jellyfish-api-core/dist/category/governance'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import {
  GovernanceProposalStatus,
  GovernanceProposalType,
  ProposalMasternodeType,
  ProposalVoteResultType
} from '@defichain/whale-api-client/dist/api/governance'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import BigNumber from 'bignumber.js'
import { createTestingApp, stopTestingApp } from '../e2e.module'
import { GovernanceController } from './governance.controller'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: GovernanceController
const testing = Testing.create(container)
let cfpProposalId: string
let vocProposalId: string
let payoutAddress: string

describe('governance proposals', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)
    await container.call('setgov', [
      { ATTRIBUTES: { 'v0/params/feature/gov': 'true' } }
    ])
    await container.generate(1)
    app = await createTestingApp(container)
    controller = app.get(GovernanceController)

    // Create 1 CFP + 1 VOC
    payoutAddress = await testing.generateAddress()
    cfpProposalId = await testing.rpc.governance.createGovCfp({
      title: 'CFP proposal',
      context: 'github',
      amount: new BigNumber(1.23),
      payoutAddress: payoutAddress,
      cycles: 2
    })
    await container.generate(1)

    vocProposalId = await testing.rpc.governance.createGovVoc({
      title: 'VOC proposal',
      context: 'github'
    })
    await container.generate(1)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  // Listing related tests
  it('should listProposals', async () => {
    const result = await controller.listProposals()
    expect(result.data.length).toStrictEqual(2)
  })

  it('should listProposals with size', async () => {
    const result = await controller.listProposals(undefined, undefined, undefined, { size: 1 })
    expect(result.data.length).toStrictEqual(1)
  })

  it('should listProposals with status', async () => {
    const result = await controller.listProposals(ListProposalsStatus.VOTING)
    expect(result.data.length).toStrictEqual(2)
  })

  it('should listProposals with type', async () => {
    const result = await controller.listProposals(undefined, ListProposalsType.CFP)
    expect(result.data.length).toStrictEqual(1)
  })

  it('should listProposals with cycle', async () => {
    const result = await controller.listProposals(undefined, undefined, 0)
    expect(result.data.length).toStrictEqual(2)
  })

  it('should listProposals with status and type', async () => {
    const result = await controller.listProposals(ListProposalsStatus.VOTING, ListProposalsType.CFP)
    expect(result.data.length).toStrictEqual(1)
  })

  it('should listProposals with status, type and cycle', async () => {
    const result = await controller.listProposals(ListProposalsStatus.VOTING, ListProposalsType.CFP, 0)
    expect(result.data.length).toStrictEqual(1)
  })

  it('should listProposals with pagination', async () => {
    const resultPage1 = await controller.listProposals(undefined, undefined, undefined, {
      size: 1
    })
    expect(resultPage1.data.length).toStrictEqual(1)
    const resultPage2 = await controller.listProposals(undefined, undefined, undefined, {
      next: resultPage1.page?.next,
      size: 1
    })
    expect(resultPage2.data.length).toStrictEqual(1)
  })

  it('should listProposals with status and pagination', async () => {
    const resultPage1 = await controller.listProposals(ListProposalsStatus.VOTING, undefined, undefined, {
      size: 1
    })
    expect(resultPage1.data.length).toStrictEqual(1)
    const resultPage2 = await controller.listProposals(ListProposalsStatus.VOTING, undefined, undefined, {
      next: resultPage1.page?.next,
      size: 1
    })
    expect(resultPage2.data.length).toStrictEqual(1)
  })

  it('should listProposals with type and pagination', async () => {
    const resultPage1 = await controller.listProposals(undefined, ListProposalsType.CFP, undefined, {
      size: 1
    })
    expect(resultPage1.data.length).toStrictEqual(1)
    const resultPage2 = await controller.listProposals(undefined, ListProposalsType.CFP, undefined, {
      next: resultPage1.page?.next,
      size: 1
    })
    expect(resultPage2.data.length).toStrictEqual(0)
  })

  it('should listProposals with status, type and pagination', async () => {
    const resultPage1 = await controller.listProposals(ListProposalsStatus.VOTING, ListProposalsType.CFP, undefined, {
      size: 1
    })
    expect(resultPage1.data.length).toStrictEqual(1)
    const resultPage2 = await controller.listProposals(ListProposalsStatus.VOTING, ListProposalsType.CFP, undefined, {
      next: resultPage1.page?.next,
      size: 1
    })
    expect(resultPage2.data.length).toStrictEqual(0)
  })

  // Get single related tests
  it('should getProposal for CFP', async () => {
    const result = await controller.getProposal(cfpProposalId)
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
    const result = await controller.getProposal(vocProposalId)
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
      fee: expect.any(Number),
      amount: undefined
    })
  })

  // List vote related tests
  // TODO: add pagination related test when playground has more than one MN to vote
  it('should listProposalVotes', async () => {
    const masternodeId = await getVotableMasternodeId()
    await testing.rpc.governance.voteGov({
      proposalId: cfpProposalId,
      masternodeId: masternodeId,
      decision: VoteDecision.NEUTRAL
    })
    await container.generate(1)
    const result = await controller.listProposalVotes(cfpProposalId)
    expect(result).toStrictEqual([
      {
        proposalId: cfpProposalId,
        masternodeId: masternodeId,
        cycle: 1,
        vote: ProposalVoteResultType.NEUTRAL
      }
    ])
  })

  it('should listProposalVotes with all masternodes', async () => {
    const masternodeId = await getVotableMasternodeId()
    await testing.rpc.governance.voteGov({
      proposalId: cfpProposalId,
      masternodeId: masternodeId,
      decision: VoteDecision.NEUTRAL
    })
    await container.generate(1)
    const result = await controller.listProposalVotes(cfpProposalId, ProposalMasternodeType.ALL)
    expect(result).toStrictEqual([
      {
        proposalId: cfpProposalId,
        masternodeId: masternodeId,
        cycle: 1,
        vote: ProposalVoteResultType.NEUTRAL
      }
    ])
  })

  it('should listProposalVotes with all masternodes and cycle', async () => {
    const masternodeId = await getVotableMasternodeId()
    await testing.rpc.governance.voteGov({
      proposalId: cfpProposalId,
      masternodeId: masternodeId,
      decision: VoteDecision.NEUTRAL
    })
    await container.generate(1)
    const result = await controller.listProposalVotes(cfpProposalId, ProposalMasternodeType.ALL, -1)
    expect(result).toStrictEqual([
      {
        proposalId: cfpProposalId,
        masternodeId: masternodeId,
        cycle: 1,
        vote: ProposalVoteResultType.NEUTRAL
      }
    ])
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
    }
  }
  return masternodeId
}
