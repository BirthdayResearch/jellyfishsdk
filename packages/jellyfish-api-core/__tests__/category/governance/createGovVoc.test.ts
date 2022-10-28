import { ContainerAdapterClient } from '../../container_adapter_client'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { GovernanceMasterNodeRegTestContainer } from './governance_container'

const container = new GovernanceMasterNodeRegTestContainer()
const client = new ContainerAdapterClient(container)

describe('On-chain governance disabled', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if on-chain governance is not enabled', async () => {
    const promise = client.governance.createGovVoc('new vote of confidence', '<Git issue url>')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot create tx, on-chain governance is not enabled')
  })
})

describe('On-chain governance enabled', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/governance/global/enabled': 'true' } })
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should createGovVoc without utxos', async () => {
    const proposalTx = await client.governance.createGovVoc('new vote of confidence', '<Git issue url>')
    await container.generate(1)

    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const proposal = await container.call('getgovproposal', [proposalTx])
    expect(proposal).toStrictEqual({
      title: 'new vote of confidence',
      context: '<Git issue url>',
      type: ProposalType.VOTE_OF_CONFIDENCE,
      status: ProposalStatus.VOTING,
      amount: expect.any(Number),
      finalizeAfter: expect.any(Number),
      nextCycle: expect.any(Number),
      totalCycles: expect.any(Number),
      payoutAddress: '',
      proposalId: proposalTx
    })
  })

  it('should createGovVoc with utxos', async () => {
    const utxo = await container.fundAddress(await container.call('getnewaddress'), 10)
    const proposalTx = await client.governance.createGovVoc('Testing new vote of confidence', '<Git issue url>', [utxo])
    await container.generate(1)

    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const rawtx = await container.call('getrawtransaction', [proposalTx, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not createGovVoc if title is empty', async () => {
    const promise = client.governance.createGovVoc('', '<Git issue url>')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test CreateVocTx execution failed:\nproposal title must not be empty\', code: -32600, method: creategovvoc')
  })

  it('should not createGovVoc if title exceeds 128 bytes', async () => {
    const promise = client.governance.createGovVoc('a'.repeat(129), '<Git issue url>')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test CreateVocTx execution failed:\nproposal title cannot be more than 128 bytes\', code: -32600, method: creategovvoc')
  })

  it('should not createGovVoc if context is empty', async () => {
    const promise = client.governance.createGovVoc('Testing new vote of confidence', '')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test CreateVocTx execution failed:\nproposal context must not be empty\', code: -32600, method: creategovvoc')
  })

  it('should not createGovVoc if context exceeds 512 bytes', async () => {
    const promise = client.governance.createGovVoc('Testing new vote of confidence', 'a'.repeat(513))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test CreateVocTx execution failed:\nproposal context cannot be more than 512 bytes\', code: -32600, method: creategovvoc')
  })

  it('should not createGovVoc with wrongly formatted utxos\' txid', async () => {
    const promise = client.governance.createGovVoc('New vote of confidence', '<Git issue url>', [{ txid: 'XXXX', vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'txid must be of length 64 (not 4, for \'XXXX\')\', code: -8, method: creategovvoc')
  })

  it('should not createGovVoc with invalid utxos\' txid', async () => {
    const txid = '817f1d1aa80bd908e845f747912bbc1bd29fc87f6e2bb762ead7330e1801c3cd' // random hex string of 64 char
    const promise = client.governance.createGovVoc('New vote of confidence', '<Git issue url>', [{ txid, vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: creategovvoc')
  })
})

describe('Governance while still in Initial Block Download', () => {
  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should not creategovvoc while still in Initial Block Download', async () => {
    const promise = client.governance.createGovVoc('New vote of confidence', '<Git issue url>')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Cannot create a voc while still in Initial Block Download\', code: -10, method: creategovvoc')
  })
})

describe('Governance with insufficient fund', () => {
  beforeAll(async () => {
    await container.start()
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should not creategovvoc with insufficient fund', async () => {
    const promise = client.governance.createGovVoc('New vote of confidence', '<Git issue url>')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: creategovvoc')
  })
})
