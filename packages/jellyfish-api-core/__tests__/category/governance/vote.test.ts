import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'
import { VoteDecision } from '../../../src/category/governance'
import { GovernanceMasterNodeRegTestContainer } from './governance_container'

describe('Governance', () => {
  const container = new GovernanceMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should vote on a proposal', async () => {
    const proposalId = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(1)

    const masternodes = await client.masternode.listMasternodes()
    let masternodeId = ''
    for (const id in masternodes) {
      const masternode = masternodes[id]
      if (masternode.mintedBlocks > 0) { // Find masternode that mined at least one block to vote on proposal
        masternodeId = id
      }
    }

    const txid = await client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES })
    await container.generate(1)
    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)
  })

  it('should not vote on a proposal with a masternode that does not exist', async () => {
    const proposalId = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(1)

    const masternodeId = '2b830a4c5673402fca8066847344a189844f5446cf2b5dfb0a6a4bb537f4a4b1'

    const promise = client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'The masternode ${masternodeId} does not exist', code: -8, method: vote`)
  })

  it('should not vote on a proposal with an inactive masternode', async () => {
    const proposalId = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(1)

    const ownerAddress = await container.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(1)

    const promise = client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test VoteTx execution failed:
masternode <${masternodeId}> is not active', code: -32600, method: vote`)
  })

  it('should not vote on a proposal with a masternode that did not mine at least one block', async () => {
    const proposalId = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])

    const ownerAddress = await container.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(20) // Enables masternode

    const promise = client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test VoteTx execution failed:
masternode <${masternodeId}> does not mine at least one block', code: -32600, method: vote`)
  })

  it('should not vote on a proposal not in voting period', async () => {
    const proposalId: string = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(200) // Expires proposal

    const ownerAddress = await container.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(20) // Enables masternode

    const promise = client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Proposal <${proposalId}> is not in voting period', code: -8, method: vote`)
  })

  it('should not vote on a proposal that does not exists', async () => {
    const proposalId: string = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])

    const masternodes = await client.masternode.listMasternodes()
    let masternodeId = ''
    for (const id in masternodes) {
      const masternode = masternodes[id]
      if (masternode.mintedBlocks > 0) { // Find masternode that mined at least one block to vote on proposal
        masternodeId = id
      }
    }

    const promise = client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Proposal <${proposalId}> does not exists', code: -8, method: vote`)
  })

  it('should vote with utxos', async () => {
    const proposalId: string = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(1)

    const masternodes = await client.masternode.listMasternodes()
    let masternodeId = ''
    for (const id in masternodes) {
      const masternode = masternodes[id]
      if (masternode.mintedBlocks > 0) { // Find masternode that mined at least one block to vote on proposal
        masternodeId = id
      }
    }

    const utxos = await container.call('listunspent', [1, 9999999, [masternodes[masternodeId].ownerAuthAddress]])
    const utxo = utxos[0]
    const voteTx = await client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES }, [utxo])
    await container.generate(1)

    expect(typeof voteTx).toStrictEqual('string')
    expect(voteTx.length).toStrictEqual(64)

    const rawtx = await container.call('getrawtransaction', [voteTx, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not vote with utxos not from the owner', async () => {
    const proposalId: string = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(1)

    const masternodes = await client.masternode.listMasternodes()
    let masternodeId = ''
    for (const id in masternodes) {
      const masternode = masternodes[id]
      if (masternode.mintedBlocks > 0) { // Find masternode that mined at least one block to vote on proposal
        masternodeId = id
      }
    }

    const utxo = await container.fundAddress(await container.call('getnewaddress'), 10)
    const promise = client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES }, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test VoteTx execution failed:
tx must have at least one input from the owner', code: -32600, method: vote`)
  })

  it('should not vote with wrongly formatted utxos\' txid', async () => {
    const proposalId: string = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(1)

    const masternodes = await client.masternode.listMasternodes()
    let masternodeId = ''
    for (const id in masternodes) {
      const masternode = masternodes[id]
      if (masternode.mintedBlocks > 0) { // Find masternode that mined at least one block to vote on proposal
        masternodeId = id
      }
    }

    const promise = client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES }, [{ txid: 'XXXX', vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'txid must be of length 64 (not 4, for \'XXXX\')\', code: -8, method: vote')
  })

  it('should not vote with invalid utxos\' txid', async () => {
    const proposalId: string = await container.call('createcfp', [{
      title: 'A community fund proposal',
      amount: 100,
      payoutAddress: await container.call('getnewaddress')
    }])
    await container.generate(1)

    const masternodes = await client.masternode.listMasternodes()
    let masternodeId = ''
    for (const id in masternodes) {
      const masternode = masternodes[id]
      if (masternode.mintedBlocks > 0) { // Find masternode that mined at least one block to vote on proposal
        masternodeId = id
      }
    }

    const txid = '817f1d1aa80bd908e845f747912bbc1bd29fc87f6e2bb762ead7330e1801c3cd' // random hex string of 64 char

    const promise = client.governance.vote({ proposalId, masternodeId, decision: VoteDecision.YES }, [{ txid, vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: vote')
  })
})
