import { ContainerAdapterClient } from '../../container_adapter_client'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Governance', () => {
  const container = new MasterNodeRegTestContainer(RegTestFoundationKeys[0])
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    await client.wallet.sendToAddress(RegTestFoundationKeys[0].owner.address, 10)
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should createGovVoc', async () => {
    const proposalTx = await client.governance.createGovVoc('new vote of confidence', 'github issue url and in future IPFS tx')
    await container.generate(1)

    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const proposal = await container.call('getgovproposal', [proposalTx])
    expect(typeof proposal.amount).toStrictEqual('number')
    expect(typeof proposal.cyclesPaid).toStrictEqual('number')
    expect(typeof proposal.totalCycles).toStrictEqual('number')
    expect(typeof proposal.finalizeAfter).toStrictEqual('number')
    expect(proposal.title).toStrictEqual('new vote of confidence')
    expect(proposal.type).toStrictEqual(ProposalType.VOTE_OF_CONFIDENCE)
    expect(proposal.status).toStrictEqual(ProposalStatus.VOTING)
    expect(proposal.payoutAddress).toStrictEqual('')
  })

  it('should createGovVoc with utxos', async () => {
    const utxo = await container.fundAddress(RegTestFoundationKeys[0].owner.address, 10)
    const proposalTx = await client.governance.createGovVoc('Testing new vote of confidence', 'github issue url and in future IPFS tx', [utxo])
    await container.generate(1)
    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const rawtx = await container.call('getrawtransaction', [proposalTx, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not createGovVoc with an empty title', async () => {
    await client.wallet.sendToAddress(RegTestFoundationKeys[0].owner.address, 1)
    await container.generate(1)
    const promise = client.governance.createGovVoc('', 'https://github.com/DeFiCh/dfips')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateVocTx execution failed:\nproposal title must not be empty', code: -32600, method: creategovvoc")
  })

  it('should not createGovVoc with a long title', async () => {
    const promise = client.governance.createGovVoc('a'.repeat(129), 'https://github.com/DeFiCh/dfips')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<title> must be 128 characters or under', code: -8, method: creategovvoc")
  })

  it('should not createGovVoc with an empty contex', async () => {
    await client.wallet.sendToAddress(RegTestFoundationKeys[0].owner.address, 1)
    await container.generate(1)
    const promise = client.governance.createGovVoc('Testing another vote of confidence', '')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateVocTx execution failed:\nproposal context must not be empty', code: -32600, method: creategovvoc")
  })

  it('should not createGovVoc with a long contex', async () => {
    const promise = client.governance.createGovVoc('Testing another vote of confidence', 'h'.repeat(513))
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<context> must be 512 characters or under', code: -8, method: creategovvoc")
  })

  it('should not createGovVoc with wrongly formatted utxos\' txid', async () => {
    const promise = client.governance.createGovVoc('New vote of confidence', 'github issue url and in future IPFS tx', [{ txid: 'XXXX', vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'txid must be of length 64 (not 4, for \'XXXX\')\', code: -8, method: creategovvoc')
  })

  it('should not createGovVoc with invalid utxos\' txid', async () => {
    const txid = '817f1d1aa80bd908e845f747912bbc1bd29fc87f6e2bb762ead7330e1801c3cd' // random hex string of 64 char
    const promise = client.governance.createGovVoc('New vote of confidence', 'github issue url and in future IPFS tx', [{ txid, vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: creategovvoc')
  })
})

describe('Governance while still in Initial Block Download', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should not createGovVoc while still in Initial Block Download', async () => {
    const promise = client.governance.createGovVoc('New vote of confidence', 'github issue url and in future IPFS tx')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Cannot create a voc while still in Initial Block Download\', code: -10, method: creategovvoc')
  })
})

describe('Governance with insufficient fund', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should not createGovVoc with insufficient fund', async () => {
    const promise = client.governance.createGovVoc('New vote of confidence', 'github issue url and in future IPFS tx')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: creategovvoc')
  })
})
