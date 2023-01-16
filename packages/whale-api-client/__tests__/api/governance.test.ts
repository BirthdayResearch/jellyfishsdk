import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import BigNumber from 'bignumber.js'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'

let cfpProposalId: string
let payoutAddress: string
let testing: Testing

describe('governance - listProposals and getProposal', () => {
  const container = new MasterNodeRegTestContainer()
  const service = new StubService(container)
  const client = new StubWhaleApiClient(service)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()
    testing = Testing.create(container)
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await testing.generate(1)

    // Create 1 CFP
    payoutAddress = await testing.generateAddress()
    cfpProposalId = await testing.rpc.governance.createGovCfp({
      title: 'CFP proposal',
      context: 'github',
      amount: new BigNumber(1.23),
      payoutAddress: payoutAddress,
      cycles: 2
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

  it('should get single proposal', async () => {
    const rpcResult = await testing.rpc.governance.getGovProposal(cfpProposalId)
    expect(rpcResult.proposalId).toStrictEqual(cfpProposalId)
    const apiResult = await client.governance.getGovProposal(cfpProposalId)
    expect(apiResult.proposalId).toStrictEqual(cfpProposalId)
  })
})
