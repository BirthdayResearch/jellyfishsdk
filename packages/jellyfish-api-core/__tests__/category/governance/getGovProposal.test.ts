import BigNumber from 'bignumber.js'
import { RpcApiError } from '../../../src'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { GovernanceMasterNodeRegTestContainer } from './governance_container'
import { ContainerAdapterClient } from '../../container_adapter_client'

const container = new GovernanceMasterNodeRegTestContainer()
const client = new ContainerAdapterClient(container)

describe('Governance', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/governance/global/enabled': 'true' } })
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
      type: ProposalType.COMMUNITY_FUND_PROPOSAL,
      status: ProposalStatus.VOTING,
      amount: new BigNumber(data.amount),
      finalizeAfter: expect.any(Number),
      nextCycle: 1,
      totalCycles: data.cycles,
      payoutAddress: data.payoutAddress,
      proposalId: proposalId
    })
  })

  it('should throw error if proposalId is invalid', async () => {
    const proposalId = 'e4087598bb396cd3a94429843453e67e68b1c7625a99b0b4c505abcc4506697b'
    const promise = client.governance.getGovProposal(proposalId)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Proposal <${proposalId}> does not exists', code: -8, method: getgovproposal`)
  })
})
