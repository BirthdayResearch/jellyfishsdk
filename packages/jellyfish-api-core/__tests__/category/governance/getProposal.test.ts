import { RpcApiError } from '../../../src'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { StartFlags } from '@defichain/testcontainers'

describe('Governance', () => {
  const tGroup = TestingGroup.create(4)
  const greatWorldHeight = 101

  beforeAll(async () => {
    const startFlags: StartFlags[] = [{ name: 'greatworldheight', value: greatWorldHeight }]
    await tGroup.start({ startFlags: startFlags })
    await tGroup.get(0).generate(100)
    await tGroup.get(3).generate(1)
    await tGroup.waitForSync()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  it('should getProposal', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: 100,
      payoutAddress: await tGroup.get(1).container.call('getnewaddress', ['', 'bech32']),
      cycles: 2
    }
    const proposalId = await tGroup.get(1).container.call('createcfp', [data])
    await tGroup.get(1).container.generate(1)

    expect(typeof proposalId).toStrictEqual('string')

    const proposal = await tGroup.get(1).rpc.governance.getProposal(proposalId)
    expect(typeof proposal.cyclesPaid).toStrictEqual('number')
    expect(typeof proposal.finalizeAfter).toStrictEqual('number')
    expect(proposal.proposalId).toStrictEqual(proposalId)
    expect(proposal.title).toStrictEqual(data.title)
    expect(proposal.type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
    expect(proposal.status).toStrictEqual(ProposalStatus.VOTING)
    expect(proposal.amount).toStrictEqual(new BigNumber(data.amount))
    expect(proposal.totalCycles).toStrictEqual(data.cycles)
    expect(proposal.payoutAddress).toStrictEqual(data.payoutAddress)
  })

  it('should not getProposal if proposalId is invalid', async () => {
    const proposalId = 'e4087598bb396cd3a94429843453e67e68b1c7625a99b0b4c505abcc4506697b'
    const promise = tGroup.get(1).rpc.governance.getProposal(proposalId)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Proposal <${proposalId}> does not exists', code: -8, method: getproposal`)
  })
})
