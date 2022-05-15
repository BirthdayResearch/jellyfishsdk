import { ContainerAdapterClient } from '../../container_adapter_client'
import { ListProposalsStatus, ListProposalsType, ProposalStatus, ProposalType } from '../../../src/category/governance'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer, StartFlags } from '@defichain/testcontainers'

describe('Governance', () => {
  const tGroup = TestingGroup.create(4)
  const greatWorldHeight = 101

  beforeAll(async () => {
    const startFlags: StartFlags[] = [{ name: 'greatworldheight', value: greatWorldHeight }]
    await tGroup.start({ startFlags: startFlags })
    await tGroup.get(0).generate(100)
    await tGroup.get(3).generate(1)
    await tGroup.waitForSync()

    await setup()
  })

  async function setup (): Promise<void> {
    await tGroup.get(1).container.call('createcfp', [{
      title: 'First community fund proposal',
      amount: 100,
      payoutAddress: await tGroup.get(1).container.call('getnewaddress', ['', 'bech32']),
      cycles: 2
    }])
    await tGroup.get(1).container.generate(200) // Expires proposal

    await tGroup.get(1).container.call('createcfp', [{
      title: 'Second community fund proposal',
      amount: 100,
      payoutAddress: await tGroup.get(1).container.call('getnewaddress', ['', 'bech32']),
      cycles: 2
    }])
    await tGroup.get(1).rpc.governance.createVoc('first vote of confidence')
    await tGroup.get(1).rpc.governance.createVoc('second vote of confidence')
    await tGroup.get(1).container.generate(1)
  }

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should listProposals', async () => {
    const proposals = await tGroup.get(1).rpc.governance.listProposals()

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
    const proposals = await tGroup.get(1).rpc.governance.listProposals({
      type: ListProposalsType.VOC
    })
    expect(proposals.length).toStrictEqual(2)
    expect(proposals.every(({ type }) => type === ProposalType.VOTE_OF_CONFIDENCE)).toStrictEqual(true)
  })

  it('should listProposals with status ListProposalsStatus.VOTING', async () => {
    const proposals = await tGroup.get(1).rpc.governance.listProposals({
      status: ListProposalsStatus.VOTING
    })
    expect(proposals.length).toStrictEqual(3)
    expect(proposals.every(({ status }) => status === ProposalStatus.VOTING)).toStrictEqual(true)
  })

  it('should listProposals with type ListProposalsType.CFP and status ListProposalsStatus.REJECTED', async () => {
    const proposals = await tGroup.get(1).rpc.governance.listProposals({
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

  it('should listProposals with empty array if no proposal available', async () => {
    const proposals = await client.governance.listProposals()
    expect(proposals.length).toStrictEqual(0)
  })
})
