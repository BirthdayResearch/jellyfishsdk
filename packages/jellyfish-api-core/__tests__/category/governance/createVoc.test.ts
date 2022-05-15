import { ContainerAdapterClient } from '../../container_adapter_client'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer, StartFlags } from '@defichain/testcontainers'

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

  it('should createVoc', async () => {
    const proposalTx = await tGroup.get(1).rpc.governance.createVoc('new vote of confidence')
    await tGroup.get(1).container.generate(1)

    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const proposal = await tGroup.get(1).container.call('getproposal', [proposalTx])
    expect(typeof proposal.amount).toStrictEqual('number')
    expect(typeof proposal.cyclesPaid).toStrictEqual('number')
    expect(typeof proposal.totalCycles).toStrictEqual('number')
    expect(typeof proposal.finalizeAfter).toStrictEqual('number')
    expect(proposal.title).toStrictEqual('new vote of confidence')
    expect(proposal.type).toStrictEqual(ProposalType.VOTE_OF_CONFIDENCE)
    expect(proposal.status).toStrictEqual(ProposalStatus.VOTING)
    expect(proposal.payoutAddress).toStrictEqual('')
  })

  it('should createVoc with utxos', async () => {
    const utxo = await tGroup.get(1).container.fundAddress(await tGroup.get(1).container.call('getnewaddress', ['', 'bech32']), 10)
    const proposalTx = await tGroup.get(1).rpc.governance.createVoc('Testing new vote of confidence', [utxo])
    await tGroup.get(1).container.generate(1)
    expect(typeof proposalTx).toStrictEqual('string')
    expect(proposalTx.length).toStrictEqual(64)

    const rawtx = await tGroup.get(1).container.call('getrawtransaction', [proposalTx, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not createVoc with wrongly formatted utxos\' txid', async () => {
    const promise = tGroup.get(1).rpc.governance.createVoc('New vote of confidence', [{ txid: 'XXXX', vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'txid must be of length 64 (not 4, for \'XXXX\')\', code: -8, method: createvoc')
  })

  it('should not createVoc with invalid utxos\' txid', async () => {
    const txid = '817f1d1aa80bd908e845f747912bbc1bd29fc87f6e2bb762ead7330e1801c3cd' // random hex string of 64 char
    const promise = tGroup.get(1).rpc.governance.createVoc('New vote of confidence', [{ txid, vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: createvoc')
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

  it('should not createVoc while still in Initial Block Download', async () => {
    const promise = client.governance.createVoc('New vote of confidence')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Cannot create a voc while still in Initial Block Download\', code: -10, method: createvoc')
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

  it('should not createVoc with insufficient fund', async () => {
    const promise = client.governance.createVoc('New vote of confidence')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: createvoc')
  })
})
