import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { ListProposalsStatus, ListProposalsType, ProposalStatus, ProposalType } from '../../../src/category/governance'
import { Testing } from '@defichain/jellyfish-testing'

describe('Governance', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  async function setup (): Promise<void> {
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await testing.container.generate(1)

    // Create cycle 1: 1 CFP
    await testing.rpc.governance.createGovCfp({
      title: 'Community fund proposal #1',
      context: '<Git issue url>',
      amount: new BigNumber(100),
      payoutAddress: await testing.container.getNewAddress()
    })
    await testing.container.generate(1)

    // Expires cycle 1
    const creationHeight = await testing.container.getBlockCount()
    const votingPeriod = 70
    const cycle1 = creationHeight + (votingPeriod - creationHeight % votingPeriod) + votingPeriod
    await testing.container.generate(cycle1 - await testing.container.getBlockCount() + 1)

    // Create cycle 2: 1 CFP + 3 VOC
    await testing.rpc.governance.createGovCfp({
      title: 'Community fund proposal #2',
      context: '<Git issue url>',
      amount: new BigNumber(100),
      payoutAddress: await testing.container.getNewAddress()
    })
    await testing.rpc.governance.createGovVoc({
      title: 'Vote of confidence #1',
      context: '<Git issue url>'
    })
    await testing.rpc.governance.createGovVoc({
      title: 'Vote of confidence #2',
      context: '<Git issue url>'
    })
    await testing.rpc.governance.createGovVoc({
      title: 'Vote of confidence #3',
      context: '<Git issue url>'
    })
    await testing.container.generate(1)
  }

  it('should listGovProposals', async () => {
    const proposals = await testing.rpc.governance.listGovProposals()

    expect(proposals.length).toStrictEqual(5)
    for (const proposal of proposals) {
      const vocExpectedResponse = {
        title: expect.any(String),
        context: expect.any(String),
        contextHash: expect.any(String),
        type: expect.any(String),
        status: expect.any(String),
        creationHeight: expect.any(Number),
        cycleEndHeight: expect.any(Number),
        proposalEndHeight: expect.any(Number),
        currentCycle: expect.any(Number),
        totalCycles: expect.any(Number),
        proposalId: expect.any(String),
        approvalThreshold: expect.any(String),
        quorum: expect.any(String),
        fee: expect.any(Number),
        votingPeriod: expect.any(Number)
      }
      if (proposal.type === ProposalType.VOTE_OF_CONFIDENCE) {
        expect(proposal).toStrictEqual(vocExpectedResponse)
      } else {
        const cfpExpectedResponse = {
          ...vocExpectedResponse,
          amount: expect.any(BigNumber),
          payoutAddress: expect.any(String)
        }
        expect(proposal).toStrictEqual(cfpExpectedResponse)
      }
    }
  })

  it('should listGovProposals with type ListProposalsType.VOC', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      type: ListProposalsType.VOC
    })
    expect(proposals.length).toStrictEqual(3)
    expect(proposals.every(({ type }) => type === ProposalType.VOTE_OF_CONFIDENCE)).toStrictEqual(true)
  })

  it('should listGovProposals with status ListProposalsStatus.VOTING', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.VOTING
    })
    expect(proposals.length).toStrictEqual(4)
    expect(proposals.every(({ status }) => status === ProposalStatus.VOTING)).toStrictEqual(true)
  })

  it('should listGovProposals with type ListProposalsType.CFP and status ListProposalsStatus.REJECTED', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      type: ListProposalsType.CFP,
      status: ListProposalsStatus.REJECTED
    })

    expect(proposals.length).toStrictEqual(1)
    expect(proposals[0].type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
    expect(proposals[0].status).toStrictEqual(ProposalStatus.REJECTED)
  })

  // Cycle: -1 related tests
  it('should listGovProposals with past cycle', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      cycle: -1
    })
    expect(proposals.length).toStrictEqual(1)
    expect(proposals[0].type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
    expect(proposals[0].status).toStrictEqual(ProposalStatus.REJECTED)
  })

  it('should listGovProposals with past cycle and type', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      type: ListProposalsType.CFP,
      cycle: -1
    })
    expect(proposals.length).toStrictEqual(1)
    expect(proposals[0].type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
    expect(proposals[0].status).toStrictEqual(ProposalStatus.REJECTED)
  })

  it('should listGovProposals with past cycle and status', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.REJECTED,
      cycle: -1
    })
    expect(proposals.length).toStrictEqual(1)
    expect(proposals[0].type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
    expect(proposals[0].status).toStrictEqual(ProposalStatus.REJECTED)
  })

  it('should listGovProposals with past cycle, status and type', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.REJECTED,
      type: ListProposalsType.CFP,
      cycle: -1
    })
    expect(proposals.length).toStrictEqual(1)
    expect(proposals[0].type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
    expect(proposals[0].status).toStrictEqual(ProposalStatus.REJECTED)
  })

  // Cycle: 2 related tests
  it('should listGovProposals with specific cycle', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      cycle: 2
    })
    expect(proposals.length).toStrictEqual(4)
    expect(proposals.filter(proposal => proposal.type === ProposalType.COMMUNITY_FUND_PROPOSAL).length).toStrictEqual(1)
    expect(proposals.filter(proposal => proposal.type === ProposalType.VOTE_OF_CONFIDENCE).length).toStrictEqual(3)
    expect(proposals.filter(proposal => proposal.status === ProposalStatus.VOTING).length).toStrictEqual(4)
  })

  it('should listGovProposals with specific cycle and status', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.VOTING,
      cycle: 2
    })
    expect(proposals.length).toStrictEqual(4)
    expect(proposals.filter(proposal => proposal.type === ProposalType.COMMUNITY_FUND_PROPOSAL).length).toStrictEqual(1)
    expect(proposals.filter(proposal => proposal.type === ProposalType.VOTE_OF_CONFIDENCE).length).toStrictEqual(3)
    expect(proposals.filter(proposal => proposal.status === ProposalStatus.VOTING).length).toStrictEqual(4)
  })

  it('should listGovProposals with specific cycle and type', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      type: ListProposalsType.CFP,
      cycle: 2
    })
    expect(proposals.length).toStrictEqual(1)
    expect(proposals.filter(proposal => proposal.type === ProposalType.COMMUNITY_FUND_PROPOSAL).length).toStrictEqual(1)
    expect(proposals.filter(proposal => proposal.status === ProposalStatus.VOTING).length).toStrictEqual(1)
  })

  it('should listGovProposals with specific cycle, status and type', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.VOTING,
      type: ListProposalsType.CFP,
      cycle: 2
    })
    expect(proposals.length).toStrictEqual(1)
    expect(proposals.filter(proposal => proposal.type === ProposalType.COMMUNITY_FUND_PROPOSAL).length).toStrictEqual(1)
    expect(proposals.filter(proposal => proposal.status === ProposalStatus.VOTING).length).toStrictEqual(1)
  })

  // Pagination related tests
  it('should return all result with limit: 0 in listGovProposals', async () => {
    const proposals = await testing.rpc.governance.listGovProposals({
      pagination: {
        limit: 0
      }
    })
    expect(proposals.length).toStrictEqual(5)
    expect(proposals.filter(proposal => proposal.type === ProposalType.COMMUNITY_FUND_PROPOSAL).length).toStrictEqual(2)
    expect(proposals.filter(proposal => proposal.type === ProposalType.VOTE_OF_CONFIDENCE).length).toStrictEqual(3)
    expect(proposals.filter(proposal => proposal.status === ProposalStatus.VOTING).length).toStrictEqual(4)
    expect(proposals.filter(proposal => proposal.status === ProposalStatus.REJECTED).length).toStrictEqual(1)
  })

  it('should listGovProposals with specific limit', async () => {
    const allProposals = await testing.rpc.governance.listGovProposals()
    const proposals = await testing.rpc.governance.listGovProposals({
      pagination: {
        limit: 2
      }
    })
    expect(proposals.length).toStrictEqual(2)
    expect(proposals).toStrictEqual(allProposals.slice(0, 2))
  })

  it('should listGovProposals with including_start: false', async () => {
    const allProposals = await testing.rpc.governance.listGovProposals()
    const proposals = await testing.rpc.governance.listGovProposals({
      pagination: {
        including_start: false
      }
    })
    expect(proposals).toStrictEqual(allProposals.slice(1))
    expect(proposals.length).toStrictEqual(4)
  })

  it('should listGovProposals with including_start and limit', async () => {
    const allProposals = await testing.rpc.governance.listGovProposals()
    const proposals = await testing.rpc.governance.listGovProposals({
      pagination: {
        including_start: false,
        limit: 2
      }
    })
    expect(proposals).toStrictEqual(allProposals.slice(1, 3))
    expect(proposals.length).toStrictEqual(2)
  })

  it('should listGovProposals with start, including_start and limit', async () => {
    const allProposals = await testing.rpc.governance.listGovProposals()
    const proposalsPage1 = await testing.rpc.governance.listGovProposals({
      pagination: {
        start: allProposals[0].proposalId,
        including_start: true,
        limit: 2
      }
    })
    const proposalsPage2 = await testing.rpc.governance.listGovProposals({
      pagination: {
        start: allProposals[2].proposalId,
        including_start: true,
        limit: 2
      }
    })
    expect(proposalsPage1).toStrictEqual(allProposals.slice(0, 2))
    expect(proposalsPage2).toStrictEqual(allProposals.slice(2, 4))
  })

  it('should listGovProposals with status, start, including_start and limit', async () => {
    const allVotingProposals = await testing.rpc.governance.listGovProposals().then(
      proposals => proposals.filter(proposal => proposal.status === ProposalStatus.VOTING)
    )
    const proposalsPage1 = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.VOTING,
      pagination: {
        limit: 2
      }
    })
    const proposalsPage2 = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.VOTING,
      pagination: {
        start: proposalsPage1[1].proposalId,
        including_start: false,
        limit: 2
      }
    })
    expect(proposalsPage1).toStrictEqual(allVotingProposals.slice(0, 2))
    expect(proposalsPage2).toStrictEqual(allVotingProposals.slice(2, 4))
  })

  it('should listGovProposals with status, type, start, including_start and limit', async () => {
    const allVotingProposals = await testing.rpc.governance.listGovProposals().then(
      proposals => proposals.filter(proposal => proposal.status === ProposalStatus.VOTING && proposal.type === ProposalType.VOTE_OF_CONFIDENCE)
    )
    const proposalsPage1 = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.VOTING,
      type: ListProposalsType.VOC,
      pagination: {
        limit: 2
      }
    })
    const proposalsPage2 = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.VOTING,
      type: ListProposalsType.VOC,
      pagination: {
        start: proposalsPage1[1].proposalId,
        including_start: false,
        limit: 2
      }
    })
    expect(proposalsPage1).toStrictEqual(allVotingProposals.slice(0, 2))
    expect(proposalsPage2).toStrictEqual(allVotingProposals.slice(-1))
  })

  it('should listGovProposals with status, type, cycle, start, including_start and limit', async () => {
    const allVotingProposals = await testing.rpc.governance.listGovProposals().then(
      proposals => proposals.filter(proposal => proposal.status === ProposalStatus.VOTING && proposal.type === ProposalType.VOTE_OF_CONFIDENCE)
    )
    const proposalsPage1 = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.VOTING,
      type: ListProposalsType.VOC,
      cycle: 2,
      pagination: {
        start: allVotingProposals[0].proposalId,
        including_start: true,
        limit: 2
      }
    })
    const proposalsPage2 = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.VOTING,
      type: ListProposalsType.VOC,
      cycle: 2,
      pagination: {
        start: allVotingProposals[2].proposalId,
        including_start: true,
        limit: 2
      }
    })
    expect(proposalsPage1).toStrictEqual(allVotingProposals.slice(0, 2))
    expect(proposalsPage2).toStrictEqual(allVotingProposals.slice(-1))
  })
})

describe('Governance without proposals', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listGovProposals with empty array if no proposal available', async () => {
    const proposals = await client.governance.listGovProposals()
    expect(proposals.length).toStrictEqual(0)
  })
})
