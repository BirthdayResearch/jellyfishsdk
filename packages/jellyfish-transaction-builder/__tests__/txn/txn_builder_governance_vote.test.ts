import { DeFiDRpcError, GenesisKeys, StartOptions } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { GovernanceMasterNodeRegTestContainer } from '../../../jellyfish-api-core/__tests__/category/governance/governance_container'
import { OP_CODES, VoteDecision } from '@defichain/jellyfish-transaction'

class CustomOperatorGovernanceMasterNodeRegTestContainer extends GovernanceMasterNodeRegTestContainer {
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      `-masternode_operator=${GenesisKeys[GenesisKeys.length - 1].operator.address}`
    ]
  }
}

describe('vote', () => {
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const testing = Testing.create(new CustomOperatorGovernanceMasterNodeRegTestContainer())

  const masternodeOperatorAddress = GenesisKeys[GenesisKeys.length - 1].operator.address
  let masternodeId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.container.call('importprivkey', [GenesisKeys[GenesisKeys.length - 1].operator.privKey, 'operator', true])
    await testing.container.call('importprivkey', [GenesisKeys[GenesisKeys.length - 1].owner.privKey, 'owner', true])

    const masternodeList = await testing.rpc.masternode.listMasternodes()
    for (const id in masternodeList) {
      if (masternodeList[id].operatorAuthAddress === masternodeOperatorAddress) {
        masternodeId = id
      }
    }

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[GenesisKeys.length - 1].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic)

    await testing.container.waitForWalletBalanceGTE(12)
    await fundEllipticPair(testing.container, providers.ellipticPair, 50)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should vote', async () => {
    const script = await providers.elliptic.script()
    const createVocTxn = await builder.governance.createCfp({
      type: 0x01,
      title: 'community fund proposal',
      amount: new BigNumber(10),
      address: script,
      cycles: 2
    }, script)

    const proposalId = calculateTxid(createVocTxn)
    await sendTransaction(testing.container, createVocTxn)

    await testing.container.generate(1, masternodeOperatorAddress) // Mint one block to be able to vote on proposal

    const vote = {
      voteDecision: VoteDecision.YES,
      proposalId,
      masternodeId
    }
    const txn = await builder.governance.vote(vote, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_VOTE(vote).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toEqual(0)
    expect(outs[0].scriptPubKey.hex).toEqual(expectedRedeemScript)
  })

  it('should not vote with unsupported vote type', async () => {
    const script = await providers.elliptic.script()
    const createVocTxn = await builder.governance.createCfp({
      type: 0x01,
      title: 'community fund proposal',
      amount: new BigNumber(10),
      address: script,
      cycles: 2
    }, script)

    const proposalId = calculateTxid(createVocTxn)
    await sendTransaction(testing.container, createVocTxn)

    await testing.container.generate(1, masternodeOperatorAddress) // Mint one block to be able to vote on proposal

    const vote = {
      voteDecision: 0x04,
      proposalId,
      masternodeId
    }
    const txn = await builder.governance.vote(vote, script)

    const promise = sendTransaction(testing.container, txn)
    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'VoteTx: unsupported vote type (code 16)', code: -26")
  })
})
