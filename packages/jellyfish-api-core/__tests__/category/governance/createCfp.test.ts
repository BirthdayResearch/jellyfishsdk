import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { GovernanceMasterNodeRegTestContainer } from './governance_container'

describe('Governance', () => {
  const container = new GovernanceMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should createCfp', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const proposalTx = await client.governance.createCfp(data)
    await container.generate(1)

    const proposal = await container.call('getproposal', [proposalTx])
    expect(proposal.title).toStrictEqual(data.title)
    expect(proposal.type).toStrictEqual(ProposalType.COMMUNITY_FUND_REQUEST)
    expect(proposal.status).toStrictEqual(ProposalStatus.VOTING)
    expect(proposal.amount).toStrictEqual(data.amount.toNumber())
    expect(proposal.cyclesPaid).toStrictEqual(1)
    expect(proposal.totalCycles).toStrictEqual(data.cycles)
    expect(proposal.payoutAddress).toStrictEqual(data.payoutAddress)
  })

  it('should not createCfp with cycles < 1', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 0
    }
    const promise = client.governance.createCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<cycles> should be between 1 and 3', code: -8, method: createcfp")
  })

  it('should not createCfp with cycle > 3', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 4
    }
    const promise = client.governance.createCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<cycles> should be between 1 and 3', code: -8, method: createcfp")
  })

  it('should not createCfp with unknown address type', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: '957fc0fd643f605b293'
    }
    const promise = client.governance.createCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Address (957fc0fd643f605b293) is of an unknown type', code: -8, method: createcfp")
  })

  it('should createCfp with utxos', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const utxo = await container.fundAddress(await container.call('getnewaddress'), 10)
    const proposalTx = await client.governance.createCfp(data, [utxo])
    await container.generate(1)
    expect(typeof proposalTx).toStrictEqual('string')

    const rawtx = await container.call('getrawtransaction', [proposalTx, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not createCfp with wrongly formatted utxos\' txid', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createCfp(data, [{ txid: 'XXXX', vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'txid must be of length 64 (not 4, for \'XXXX\')\', code: -8, method: createcfp')
  })

  it('should not createCfp with invalid utxos\' txid', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const txid = '817f1d1aa80bd908e845f747912bbc1bd29fc87f6e2bb762ead7330e1801c3cd' // random hex string of 64 char
    const promise = client.governance.createCfp(data, [{ txid, vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: createcfp')
  })
})

describe('Governance while still in Initial Block Download', () => {
  const container = new GovernanceMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should not createCfp while still in Initial Block Download', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Cannot create a cfp while still in Initial Block Download\', code: -10, method: createcfp')
  })
})

describe('Governance with insufficient fund', () => {
  const container = new GovernanceMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should not createCfp with insufficient fund', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: createcfp')
  })
})
