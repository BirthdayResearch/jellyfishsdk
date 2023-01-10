import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { ListProposalsStatus, ListProposalsType, ProposalInfo, ProposalStatus, ProposalType } from '../../../src/category/governance'
import { Testing } from '@defichain/jellyfish-testing'

describe('Governance', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    await setup()
  })

  async function setup (): Promise<void> {
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await container.generate(1)

    await client.governance.createGovCfp({
      title: 'First community fund proposal',
      context: '<Git issue url>',
      amount: new BigNumber(100),
      payoutAddress: await container.getNewAddress()
    })
    await container.generate(200) // Expires proposal

    await client.governance.createGovCfp({
      title: 'Second community fund proposal',
      context: '<Git issue url>',
      amount: new BigNumber(100),
      payoutAddress: await container.getNewAddress()
    })
    await client.governance.createGovVoc({
      title: 'first vote of confidence',
      context: '<Git issue url>'
    })
    await client.governance.createGovVoc({
      title: 'second vote of confidence',
      context: '<Git issue url>'
    })
    await container.generate(1)
  }

  afterAll(async () => {
    await container.stop()
  })

  it('should listGovProposals', async () => {
    const proposals = await client.governance.listGovProposals()

    expect(proposals.length).toStrictEqual(4)
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
    const proposals = await client.governance.listGovProposals({
      type: ListProposalsType.VOC
    })
    expect(proposals.length).toStrictEqual(2)
    expect(proposals.every(({ type }) => type === ProposalType.VOTE_OF_CONFIDENCE)).toStrictEqual(true)
  })

  it('should listGovProposals with status ListProposalsStatus.VOTING', async () => {
    const proposals = await client.governance.listGovProposals({
      status: ListProposalsStatus.VOTING
    })
    expect(proposals.length).toStrictEqual(3)
    expect(proposals.every(({ status }) => status === ProposalStatus.VOTING)).toStrictEqual(true)
  })

  it('should listGovProposals with type ListProposalsType.CFP and status ListProposalsStatus.REJECTED', async () => {
    const proposals = await client.governance.listGovProposals({
      type: ListProposalsType.CFP,
      status: ListProposalsStatus.REJECTED
    })

    expect(proposals.length).toStrictEqual(1)
    expect(proposals[0].type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
    expect(proposals[0].status).toStrictEqual(ProposalStatus.REJECTED)
  })
})

describe('Governance proposals with cycle and pagination', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  function proposalLogMapper (proposal: ProposalInfo): {proposalId: string, title: string} {
    return {
      proposalId: proposal.proposalId,
      title: proposal.title
    }
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await testing.container.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listGovProposals with past cycle', async () => {
    const data = {
      title: 'A vote of confidence',
      context: '<Git issue url>'
    }
    await testing.rpc.governance.createGovVoc(data)
    await testing.container.generate(200) // Expires proposal

    // Filter by cycle
    const allProposals = await testing.rpc.governance.listGovProposals({
      cycle: -1
    })
    expect(allProposals.length).toStrictEqual(1)
    expect(allProposals[0].type).toStrictEqual(ProposalType.VOTE_OF_CONFIDENCE)
    expect(allProposals[0].title).toStrictEqual(data.title)
    expect(allProposals[0].context).toStrictEqual(data.context)

    // Filter by type and cycle
    const cfpProposals = await testing.rpc.governance.listGovProposals({
      type: ListProposalsType.CFP,
      cycle: -1
    })
    expect(cfpProposals.length).toStrictEqual(0)

    // Filter by status and cycle
    const completedProposals = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.COMPLETED,
      cycle: -1
    })
    expect(completedProposals.length).toStrictEqual(0)

    // Filter by status, type and cycle
    const cfpRejectedProposals = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.REJECTED,
      type: ListProposalsType.CFP,
      cycle: -1
    })
    expect(cfpRejectedProposals.length).toStrictEqual(0)
  })

  it('should listGovProposals with specific voting cycle', async () => {
    const cfpData1 = {
      title: 'Community fund proposal #1',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await testing.container.getNewAddress(),
      cycles: 1
    }
    const cfpData2 = {
      title: 'Community fund proposal #2',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await testing.container.getNewAddress(),
      cycles: 1
    }
    await testing.rpc.governance.createGovCfp(cfpData1) // Create voting cycle 1 proposal
    await testing.container.generate(1)
    const creationHeight = await testing.container.getBlockCount()
    const votingPeriod = 70
    const cycle1 = creationHeight + (votingPeriod - creationHeight % votingPeriod) + votingPeriod
    await testing.container.generate(cycle1 - await testing.container.getBlockCount() + 1) // Allow voting cycle 1 to expires
    await testing.rpc.governance.createGovCfp(cfpData2) // Create voting cycle 2 proposal
    await testing.container.generate(1)

    // Filter by cycle
    const allProposals = await testing.rpc.governance.listGovProposals({
      cycle: 2
    })
    expect(allProposals.length).toStrictEqual(1)
    expect(allProposals[0].type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
    expect(allProposals[0].title).toStrictEqual(cfpData2.title)
    expect(allProposals[0].context).toStrictEqual(cfpData2.context)

    // Filter by type and cycle
    const vocProposals = await testing.rpc.governance.listGovProposals({
      type: ListProposalsType.VOC,
      cycle: 2
    })
    expect(vocProposals.length).toStrictEqual(0)

    // Filter by status and cycle
    const rejectedProposals = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.REJECTED,
      cycle: 2
    })
    expect(rejectedProposals.length).toStrictEqual(0)

    // Filter by status, type and cycle
    const vocRejectedProposals = await testing.rpc.governance.listGovProposals({
      status: ListProposalsStatus.REJECTED,
      type: ListProposalsType.VOC,
      cycle: 2
    })
    expect(vocRejectedProposals.length).toStrictEqual(0)
  })

  it.only('should listGovProposals with pagination', async () => {
    const data1 = {
      title: 'Vote of confidence #1',
      context: '<Git issue url>'
    }
    const data2 = {
      title: 'Vote of confidence #2',
      context: '<Git issue url>'
    }
    const data3 = {
      title: 'Vote of confidence #3',
      context: '<Git issue url>'
    }
    // Create 3 VOC proposals
    const voc1 = await testing.rpc.governance.createGovVoc(data1)
    await testing.container.generate(1)
    const voc2 = await testing.rpc.governance.createGovVoc(data2)
    await testing.container.generate(1)
    const voc3 = await testing.rpc.governance.createGovVoc(data3)
    await testing.container.generate(1)
    console.log('voc1', voc1)
    console.log('voc2', voc2)
    console.log('voc3', voc3)

    // List all proposals
    const allProposals = await testing.rpc.governance.listGovProposals()
    console.log('All proposals', allProposals.map(proposalLogMapper))

    // List with pagination
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
    console.log('Page 1 proposal', proposalsPage1.map(proposalLogMapper))
    console.log('Page 2 proposal', proposalsPage2.map(proposalLogMapper))

    // All records
    const proposals1 = await testing.rpc.governance.listGovProposals({
      pagination: {
        limit: 0
      }
    })
    expect(proposals1.length).toStrictEqual(3)

    // Filter for limit
    const proposals2 = await testing.rpc.governance.listGovProposals({
      pagination: {
        limit: 2
      }
    })
    expect(proposals2.length).toStrictEqual(2)

    // Filter with including_start
    const proposals3 = await testing.rpc.governance.listGovProposals({
      pagination: {
        including_start: false
      }
    })
    expect(proposals3).toStrictEqual(allProposals.slice(1))

    const proposals4 = await testing.rpc.governance.listGovProposals({
      pagination: {
        including_start: true
      }
    })
    expect(proposals4).toStrictEqual(allProposals)

    // Filter with including_start and limit
    const proposals5 = await testing.rpc.governance.listGovProposals({
      pagination: {
        including_start: true,
        limit: 2
      }
    })
    expect(proposals5).toStrictEqual(allProposals.slice(0, 2))
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
