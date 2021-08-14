import { ContainerAdapterClient } from '../../container_adapter_client'
import { ListProposalsStatus, ListProposalsType, ProposalStatus, ProposalType } from '../../../src/category/governance'
import { GovernanceMasterNodeRegTestContainer } from './governance_container'
import BigNumber from 'bignumber.js'

describe('Governance', () => {
  const container = new GovernanceMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    await setup()
  })

  async function setup (): Promise<void> {
    await container.call('createcfp', [{
      title: 'First community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(200) // Expires proposal

    await container.call('createcfp', [{
      title: 'Second community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await client.governance.createVoc('first vote of confidence')
    await client.governance.createVoc('second vote of confidence')
    await container.generate(1)
  }

  afterAll(async () => {
    await container.stop()
  })

  it('should listProposals', async () => {
    const proposals = await client.governance.listProposals()

    expect(proposals.length).toStrictEqual(4)
    for (const proposal of proposals) {
      expect(typeof proposal.proposalId).toStrictEqual('string')
      expect(typeof proposal.title).toStrictEqual('string')
      expect(typeof proposal.type).toStrictEqual('string')
      expect(typeof proposal.status).toStrictEqual('string')
      expect(proposal.amount instanceof BigNumber).toStrictEqual(true)
      expect(typeof proposal.totalCycles).toStrictEqual('number')
      expect(typeof proposal.cyclesPaid).toStrictEqual('number')
      expect(typeof proposal.finalizeAfter).toStrictEqual('number')
      expect(typeof proposal.payoutAddress).toStrictEqual('string')
    }
  })

  it('should listProposals with type ListProposalsType.VOC', async () => {
    const proposals = await client.governance.listProposals({
      type: ListProposalsType.VOC
    })
    expect(proposals.length).toStrictEqual(2)
    expect(proposals.every(({ type }) => type === ProposalType.VOTE_OF_CONFIDENCE)).toStrictEqual(true)
  })

  it('should listProposals with status ListProposalsStatus.VOTING', async () => {
    const proposals = await client.governance.listProposals({
      status: ListProposalsStatus.VOTING
    })
    expect(proposals.length).toStrictEqual(3)
    expect(proposals.every(({ status }) => status === ProposalStatus.VOTING)).toStrictEqual(true)
  })

  it('should listProposals with type ListProposalsType.CFP and status ListProposalsStatus.REJECTED', async () => {
    const proposals = await client.governance.listProposals({
      type: ListProposalsType.CFP,
      status: ListProposalsStatus.REJECTED
    })

    expect(proposals.length).toStrictEqual(1)
    expect(proposals[0].type).toStrictEqual(ProposalType.COMMUNITY_FUND_REQUEST)
    expect(proposals[0].status).toStrictEqual(ProposalStatus.REJECTED)
  })
})

describe('Governance without proposals', () => {
  const container = new GovernanceMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listProposals with empty array if no proposal available', async () => {
    const proposals = await client.governance.listProposals()
    expect(proposals.length).toStrictEqual(0)
  })
})
