import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer, StartFlags } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

describe('Governance', () => {
  const tGroup = TestingGroup.create(4, (index) => {
    switch (index) {
      case 0: return new MasterNodeRegTestContainer(RegTestFoundationKeys[0])
      case 1: return new MasterNodeRegTestContainer(RegTestFoundationKeys[1])
      case 2: return new MasterNodeRegTestContainer(RegTestFoundationKeys[RegTestFoundationKeys.length - 2])
      case 3: return new MasterNodeRegTestContainer(RegTestFoundationKeys[RegTestFoundationKeys.length - 1])
      default: return new MasterNodeRegTestContainer(RegTestFoundationKeys[0])
    }
  })
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

  it('should createCfp1', async () => {
    // Transfer funds
    await tGroup.get(0).rpc.wallet.sendToAddress(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.address, 1000)
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const blockCount = await tGroup.get(3).container.getBlockCount()
    expect(blockCount).toBeGreaterThan(greatWorldHeight)

    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await tGroup.get(3).container.call('getnewaddress', ['', 'bech32']),
      cycles: 2
    }
    const proposalTx = await tGroup.get(3).rpc.governance.createCfp(data)
    await tGroup.get(3).generate(1)

    const proposal = await tGroup.get(3).container.call('getproposal', [proposalTx])
    expect(proposal.title).toStrictEqual(data.title)
    expect(proposal.type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
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
      payoutAddress: await tGroup.get(1).container.call('getnewaddress'),
      cycles: 0
    }
    const promise = tGroup.get(1).rpc.governance.createCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<cycles> should be between 1 and 3', code: -8, method: createcfp")
  })

  it('should not createCfp with cycle > 3', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await tGroup.get(1).container.call('getnewaddress'),
      cycles: 4
    }
    const promise = tGroup.get(1).rpc.governance.createCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<cycles> should be between 1 and 3', code: -8, method: createcfp")
  })

  it('should not createCfp with unknown address type', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: '957fc0fd643f605b293'
    }
    const promise = tGroup.get(1).rpc.governance.createCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Address (957fc0fd643f605b293) is of an unknown type', code: -8, method: createcfp")
  })

  it('should createCfp with utxos', async () => {
    const address = await tGroup.get(0).container.call('getnewaddress', ['', 'bech32'])
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: address,
      cycles: 2
    }
    const utxo = await tGroup.get(0).container.fundAddress(address, 10)
    const proposalTx = await tGroup.get(0).rpc.governance.createCfp(data, [utxo])
    await tGroup.get(0).container.generate(1)
    expect(typeof proposalTx).toStrictEqual('string')

    const rawtx = await tGroup.get(0).container.call('getrawtransaction', [proposalTx, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not createCfp with wrongly formatted utxos\' txid', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await tGroup.get(1).container.call('getnewaddress'),
      cycles: 2
    }
    const promise = tGroup.get(1).rpc.governance.createCfp(data, [{ txid: 'XXXX', vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'txid must be of length 64 (not 4, for \'XXXX\')\', code: -8, method: createcfp')
  })

  it('should not createCfp with invalid utxos\' txid', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      payoutAddress: await tGroup.get(1).container.call('getnewaddress'),
      cycles: 2
    }
    const txid = '817f1d1aa80bd908e845f747912bbc1bd29fc87f6e2bb762ead7330e1801c3cd' // random hex string of 64 char
    const promise = tGroup.get(1).rpc.governance.createCfp(data, [{ txid, vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: createcfp')
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
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
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
