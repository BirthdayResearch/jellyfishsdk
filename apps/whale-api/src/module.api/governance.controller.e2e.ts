import { VoteDecision } from '@defichain/jellyfish-api-core/dist/category/governance'
import { Testing } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import {
  GovernanceProposalStatus,
  GovernanceProposalType,
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
let dfipProposalId: string
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

    // Create proposals
    payoutAddress = await testing.generateAddress()
    cfpProposalId = await testing.rpc.governance.createGovCfp({
      title: 'CFP proposal',
      context: 'github',
      amount: new BigNumber(1.23),
      payoutAddress: payoutAddress,
      cycles: 2
    })
    await container.generate(1)

    dfipProposalId = await testing.rpc.governance.createGovVoc({
      title: 'DFIP proposal',
      context: 'github'
    })
    await container.generate(1)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should listProposals', async () => {
    const result = await controller.listProposals({ size: 100 })
    expect(result.data.length).toStrictEqual(2)
  })

  it('should get CFP proposal', async () => {
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

  it('should get DFIP proposal', async () => {
    const result = await controller.getProposal(dfipProposalId)
    expect(result).toStrictEqual({
      proposalId: dfipProposalId,
      creationHeight: 104,
      title: 'DFIP proposal',
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

  it('should get proposal votes', async () => {
    const masternodes = await testing.rpc.masternode.listMasternodes()
    let masternodeId = ''
    for (const id in masternodes) {
      const masternode = masternodes[id]
      if (masternode.mintedBlocks > 0) {
        // Find masternode that mined at least one block to vote on proposal
        masternodeId = id
      }
    }

    await testing.rpc.governance.voteGov({
      proposalId: cfpProposalId,
      masternodeId: masternodeId,
      decision: VoteDecision.YES
    })
    await container.generate(1)

    const result = await controller.listProposalVotes(cfpProposalId)
    expect(result).toStrictEqual([{
      proposalId: cfpProposalId,
      masternodeId: masternodeId,
      cycle: 1,
      vote: ProposalVoteResultType.YES
    }])
  })
})
