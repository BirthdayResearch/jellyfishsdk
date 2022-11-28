import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const container = new MasterNodeRegTestContainer()
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
    const data = {
      title: 'new vote of confidence',
      context: '<Git issue url>'
    }
    const promise = client.governance.createGovVoc(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot create tx, on-chain governance is not enabled')
  })
})

describe('On-chain governance enabled', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should createGovVoc without utxos', async () => {
    const data = {
      title: 'new vote of confidence',
      context: '<Git issue url>'
    }
    const proposalTx = await client.governance.createGovVoc(data)
    await container.generate(1)

    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const proposal = await container.call('getgovproposal', [proposalTx])
    expect(proposal).toStrictEqual({
      title: 'new vote of confidence',
      context: '<Git issue url>',
      contextHash: '',
      type: ProposalType.VOTE_OF_CONFIDENCE,
      status: ProposalStatus.VOTING,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: expect.any(Number),
      totalCycles: expect.any(Number),
      proposalId: proposalTx,
      approvalThreshold: expect.any(String),
      fee: expect.any(Number),
      quorum: expect.any(String),
      votingPeriod: expect.any(Number)
    })
  })

  it('should createGovVoc with context hash', async () => {
    const data = {
      title: 'new vote of confidence',
      context: '<Git issue url>',
      contextHash: '<context hash>'
    }
    const proposalTx = await client.governance.createGovVoc(data)
    await container.generate(1)

    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const proposal = await container.call('getgovproposal', [proposalTx])
    expect(proposal).toStrictEqual({
      title: 'new vote of confidence',
      context: '<Git issue url>',
      contextHash: '<context hash>',
      type: ProposalType.VOTE_OF_CONFIDENCE,
      status: ProposalStatus.VOTING,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: expect.any(Number),
      totalCycles: expect.any(Number),
      proposalId: proposalTx,
      approvalThreshold: expect.any(String),
      fee: expect.any(Number),
      quorum: expect.any(String),
      votingPeriod: expect.any(Number)
    })
  })

  it('should create emergency vote of confidence', async () => {
    const utxo = await container.fundAddress(await container.call('getnewaddress'), 10)
    const data = {
      title: 'new emergency vote of confidence',
      context: '<Git issue url>',
      emergency: true
    }
    const proposalTx = await client.governance.createGovVoc(data, [utxo])
    await container.generate(1)

    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const proposal = await container.call('getgovproposal', [proposalTx])
    expect(proposal).toStrictEqual({
      title: 'new emergency vote of confidence',
      context: '<Git issue url>',
      contextHash: '',
      type: ProposalType.VOTE_OF_CONFIDENCE,
      status: ProposalStatus.VOTING,
      creationHeight: expect.any(Number),
      cycleEndHeight: expect.any(Number),
      proposalEndHeight: expect.any(Number),
      currentCycle: expect.any(Number),
      totalCycles: expect.any(Number),
      proposalId: proposalTx,
      approvalThreshold: expect.any(String),
      fee: expect.any(Number),
      quorum: expect.any(String),
      votingPeriod: expect.any(Number),
      options: ['emergency']
    })
  })

  it('should createGovVoc with utxos', async () => {
    const utxo = await container.fundAddress(await container.call('getnewaddress'), 10)
    const data = {
      title: 'new vote of confidence',
      context: '<Git issue url>'
    }
    const proposalTx = await client.governance.createGovVoc(data, [utxo])
    await container.generate(1)

    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const rawtx = await container.call('getrawtransaction', [proposalTx, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not createGovVoc if title is empty', async () => {
    const data = {
      title: '',
      context: '<Git issue url>'
    }
    const promise = client.governance.createGovVoc(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test CreateVocTx execution failed:\nproposal title must not be empty\', code: -32600, method: creategovvoc')
  })

  it('should not createGovVoc if title exceeds 128 bytes', async () => {
    const data = {
      title: 'a'.repeat(129),
      context: '<Git issue url>'
    }
    const promise = client.governance.createGovVoc(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test CreateVocTx execution failed:\nproposal title cannot be more than 128 bytes\', code: -32600, method: creategovvoc')
  })

  it('should not createGovVoc if context is empty', async () => {
    const data = {
      title: 'new vote of confidence',
      context: ''
    }
    const promise = client.governance.createGovVoc(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test CreateVocTx execution failed:\nproposal context must not be empty\', code: -32600, method: creategovvoc')
  })

  it('should not createGovVoc if context exceeds 512 bytes', async () => {
    const data = {
      title: 'new vote of confidence',
      context: 'a'.repeat(513)
    }
    const promise = client.governance.createGovVoc(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test CreateVocTx execution failed:\nproposal context cannot be more than 512 bytes\', code: -32600, method: creategovvoc')
  })

  it('should not createGovVoc if context hash exceeds 512 bytes', async () => {
    const data = {
      title: 'new vote of confidence',
      context: '<Git issue url>',
      contextHash: 'a'.repeat(513)
    }
    const promise = client.governance.createGovVoc(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test CreateVocTx execution failed:\nproposal context hash cannot be more than 512 bytes\', code: -32600, method: creategovvoc')
  })

  it('should not createGovVoc with wrongly formatted utxos\' txid', async () => {
    const data = {
      title: 'new vote of confidence',
      context: '<Git issue url>'
    }
    const promise = client.governance.createGovVoc(data, [{ txid: 'XXXX', vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'txid must be of length 64 (not 4, for \'XXXX\')\', code: -8, method: creategovvoc')
  })

  it('should not createGovVoc with invalid utxos\' txid', async () => {
    const data = {
      title: 'new vote of confidence',
      context: '<Git issue url>'
    }
    const txid = '817f1d1aa80bd908e845f747912bbc1bd29fc87f6e2bb762ead7330e1801c3cd' // random hex string of 64 char
    const promise = client.governance.createGovVoc(data, [{ txid, vout: 1 }])
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
    const data = {
      title: 'new vote of confidence',
      context: '<Git issue url>'
    }
    const promise = client.governance.createGovVoc(data)
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
    const data = {
      title: 'new vote of confidence',
      context: '<Git issue url>'
    }
    const promise = client.governance.createGovVoc(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: creategovvoc')
  })
})
