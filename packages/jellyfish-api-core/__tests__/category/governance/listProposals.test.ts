import { ContainerAdapterClient } from '../../container_adapter_client'
import { ListProposalsStatus, ListProposalsType, ProposalStatus, ProposalType } from '../../../src/category/governance'
import BigNumber from 'bignumber.js'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Governance', () => {
  const container = new MasterNodeRegTestContainer(RegTestFoundationKeys[RegTestFoundationKeys.length - 1])
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    await client.wallet.sendToAddress(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.address, 10)
    await container.generate(1)

    await setup()
  })

  async function setup (): Promise<void> {
    await container.call('creategovcfp', [{
      title: 'First community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(198) // Expires proposal

    await client.wallet.sendToAddress(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.address, 2)
    await container.generate(1)

    await container.call('creategovcfp', [{
      title: 'Second community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])

    await client.wallet.sendToAddress(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.address, 3)
    await container.generate(1)

    await client.governance.createGovVoc('first vote of confidence', 'https://github.com/DeFiCh/dfips')

    await client.wallet.sendToAddress(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.address, 3)
    await container.generate(1)

    await client.governance.createGovVoc('second vote of confidence', 'https://github.com/DeFiCh/dfips')
    await container.generate(1)
  }

  afterAll(async () => {
    await container.stop()
  })

  it('should listGovProposals', async () => {
    const proposals = await client.governance.listGovProposals()

    expect(proposals.length).toStrictEqual(4)
    for (const proposal of proposals) {
      expect(typeof proposal.proposalId).toStrictEqual('string')
      expect(typeof proposal.title).toStrictEqual('string')
      expect(typeof proposal.context).toStrictEqual('string')
      expect(typeof proposal.type).toStrictEqual('string')
      expect(typeof proposal.status).toStrictEqual('string')
      expect(proposal.amount instanceof BigNumber).toStrictEqual(true)
      expect(typeof proposal.totalCycles).toStrictEqual('number')
      expect(typeof proposal.nextCycle).toStrictEqual('number')
      expect(typeof proposal.finalizeAfter).toStrictEqual('number')
      expect(typeof proposal.payoutAddress).toStrictEqual('string')
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
