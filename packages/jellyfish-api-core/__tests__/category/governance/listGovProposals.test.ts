import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { ListProposalsStatus, ListProposalsType, ProposalStatus, ProposalType } from '../../../src/category/governance'

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
      expect(proposal).toStrictEqual({
        title: expect.any(String),
        context: expect.any(String),
        contextHash: expect.any(String),
        type: expect.any(String),
        status: expect.any(String),
        amount: expect.any(BigNumber),
        cycleEndHeight: expect.any(Number),
        proposalEndHeight: expect.any(Number),
        currentCycle: expect.any(Number),
        totalCycles: expect.any(Number),
        payoutAddress: expect.any(String),
        proposalId: expect.any(String),
        approvalThreshold: expect.any(String),
        quorum: expect.any(String),
        fee: expect.any(Number),
        feeBurnAmount: expect.any(Number),
        votingPeriod: expect.any(Number)
      })
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
