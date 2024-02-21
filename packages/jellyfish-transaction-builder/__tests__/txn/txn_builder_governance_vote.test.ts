import { DeFiDRpcError, StartOptions, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing } from '@defichain/jellyfish-testing'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { calculateTxid, fundEllipticPair, sendTransaction } from '../test.utils'
import { WIF } from '@defichain/jellyfish-crypto'
import BigNumber from 'bignumber.js'
import { OP_CODES, Vote } from '@defichain/jellyfish-transaction'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'

class CustomOperatorGovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      `-masternode_operator=${RegTestFoundationKeys[RegTestFoundationKeys.length - 1].operator.address}` // Uses masternode_operator with bech32 address to be able to craft vote transaction
    ]
  }
}

describe('vote', () => {
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const testing = Testing.create(new CustomOperatorGovernanceMasterNodeRegTestContainer())

  const masternodeOperatorAddress = RegTestFoundationKeys[RegTestFoundationKeys.length - 1].operator.address
  let masternodeId: string

  beforeEach(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })

    await testing.container.call('importprivkey', [RegTestFoundationKeys[RegTestFoundationKeys.length - 1].operator.privKey, 'operator', true])
    await testing.container.call('importprivkey', [RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.privKey, 'owner', true])

    const masternodeList = await testing.rpc.masternode.listMasternodes()
    for (const id in masternodeList) {
      if (masternodeList[id].operatorAuthAddress === masternodeOperatorAddress) {
        masternodeId = id
        break
      }
    }

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.container.waitForWalletBalanceGTE(12)
    await fundEllipticPair(testing.container, providers.ellipticPair, 100)
    await providers.setupMocks()
  })

  afterEach(async () => {
    await testing.container.stop()
  })

  it('should vote', async () => {
    const script = await providers.elliptic.script()
    const createVocTxn = await builder.governance.createCfp({
      type: 0x01,
      title: 'community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(10),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const proposalId = calculateTxid(createVocTxn)
    await sendTransaction(testing.container, createVocTxn)

    await testing.container.generate(1, masternodeOperatorAddress) // Mint one block to be able to vote on proposal

    const vote: Vote = {
      voteDecision: 0x01,
      proposalId,
      masternodeId
    }
    const txn = await builder.governance.vote(vote, script)

    const encoded: string = OP_CODES.OP_DEFI_TX_VOTE(vote).asBuffer().toString('hex')
    const expectedRedeemScript = `6a${encoded}`

    const outs = await sendTransaction(testing.container, txn)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedRedeemScript)
  })

  it('should not vote on a proposal with a masternode that does not exist', async () => {
    const script = await providers.elliptic.script()
    const createVocTxn = await builder.governance.createCfp({
      type: 0x01,
      title: 'community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(10),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const proposalId = calculateTxid(createVocTxn)
    await sendTransaction(testing.container, createVocTxn)

    await testing.container.generate(1, masternodeOperatorAddress) // Mint one block to be able to vote on proposal
    const invalidMasternodeId = '2b830a4c5673402fca8066847344a189844f5446cf2b5dfb0a6a4bb537f4a4b1'

    const vote: Vote = {
      voteDecision: 0x01,
      proposalId,
      masternodeId: invalidMasternodeId
    }
    const txn = await builder.governance.vote(vote, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'VoteTx: masternode <${invalidMasternodeId}> does not exist', code: -26`)
  })

  it('should not vote on a proposal that does not exist', async () => {
    const script = await providers.elliptic.script()
    const createVocTxn = await builder.governance.createCfp({
      type: 0x01,
      title: 'community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(10),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const proposalId = calculateTxid(createVocTxn)

    await testing.container.generate(1, masternodeOperatorAddress) // Mint one block to be able to vote on proposal

    const vote: Vote = {
      voteDecision: 0x01,
      proposalId,
      masternodeId
    }
    const txn = await builder.governance.vote(vote, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'VoteTx: proposal <${proposalId}> does not exist', code: -26`)
  })

  it('should not vote on a proposal with a masternode that did not mint at least one block', async () => {
    const script = await providers.elliptic.script()
    const createVocTxn = await builder.governance.createCfp({
      type: 0x01,
      title: 'community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(10),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const proposalId = calculateTxid(createVocTxn)
    await sendTransaction(testing.container, createVocTxn)

    const vote: Vote = {
      voteDecision: 0x01,
      proposalId,
      masternodeId
    }
    const txn = await builder.governance.vote(vote, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'VoteTx: masternode <${masternodeId}> does not mine at least one block', code: -26`)
  })

  it('should not vote on a proposal not in voting period', async () => {
    const script = await providers.elliptic.script()
    const createVocTxn = await builder.governance.createCfp({
      type: 0x01,
      title: 'community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(10),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const proposalId = calculateTxid(createVocTxn)
    await sendTransaction(testing.container, createVocTxn)

    await testing.container.generate(1, masternodeOperatorAddress) // Mint one block to be able to vote on proposal
    await testing.container.generate(150) // expires proposal

    const vote: Vote = {
      voteDecision: 0x01,
      proposalId,
      masternodeId
    }
    const txn = await builder.governance.vote(vote, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow(`DeFiDRpcError: 'VoteTx: proposal <${proposalId}> is not in voting period', code: -26`)
  })
})

describe('vote with masternode operator with legacy address', () => {
  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder
  const testing = Testing.create(new MasterNodeRegTestContainer())

  let masternodeId: string
  let masternodeOperatorAddress: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.rpc.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })

    const masternodeList = await testing.rpc.masternode.listMasternodes()
    for (const id in masternodeList) {
      if (masternodeList[id].localMasternode) {
        masternodeId = id
        masternodeOperatorAddress = masternodeList[id].operatorAuthAddress
        break
      }
    }

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey))
    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await testing.container.waitForWalletBalanceGTE(12)
    await fundEllipticPair(testing.container, providers.ellipticPair, 50)
    await providers.setupMocks()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should not vote without at least one input from the owner', async () => {
    const script = await providers.elliptic.script()
    const createVocTxn = await builder.governance.createCfp({
      type: 0x01,
      title: 'community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      contexthash: '<context hash>',
      nAmount: new BigNumber(10),
      address: script,
      nCycles: 2,
      options: 0x00
    }, script)

    const proposalId = calculateTxid(createVocTxn)
    await sendTransaction(testing.container, createVocTxn)

    await testing.container.generate(1, masternodeOperatorAddress) // Mint one block to be able to vote on proposal

    const txn = await builder.governance.vote({
      voteDecision: 0x01,
      proposalId,
      masternodeId
    }, script)

    const promise = sendTransaction(testing.container, txn)

    await expect(promise).rejects.toThrow(DeFiDRpcError)
    await expect(promise).rejects.toThrow("DeFiDRpcError: 'VoteTx: tx must have at least one input from the owner', code: -26")
  })
})
