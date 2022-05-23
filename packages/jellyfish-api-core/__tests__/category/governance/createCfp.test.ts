import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

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

  it('should createGovCfp', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const proposalTx = await client.governance.createGovCfp(data)
    await container.generate(1)

    const proposal = await container.call('getgovproposal', [proposalTx])
    expect(proposal.title).toStrictEqual(data.title)
    expect(proposal.type).toStrictEqual(ProposalType.COMMUNITY_FUND_PROPOSAL)
    expect(proposal.status).toStrictEqual(ProposalStatus.VOTING)
    expect(proposal.amount).toStrictEqual(data.amount.toNumber())
    expect(proposal.cyclesPaid).toStrictEqual(1)
    expect(proposal.totalCycles).toStrictEqual(data.cycles)
    expect(proposal.payoutAddress).toStrictEqual(data.payoutAddress)
  })

  it('should not createGovCfp with an empty title', async () => {
    await client.wallet.sendToAddress(RegTestFoundationKeys[0].owner.address, 2)
    await container.generate(1)
    const data = {
      title: '',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal title must not be empty', code: -32600, method: creategovcfp")
  })

  it('should not createGovCfp with a long title', async () => {
    const data = {
      title: 'a'.repeat(129),
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<title> must be 128 characters or under', code: -8, method: creategovcfp")
  })

  it('should not createGovCfp with an empty contex', async () => {
    await client.wallet.sendToAddress(RegTestFoundationKeys[0].owner.address, 1)
    await container.generate(1)
    const data = {
      title: 'Testing another community fund proposal',
      context: '',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal context must not be empty', code: -32600, method: creategovcfp")
  })

  it('should not createGovCfp with a long contex', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      context: 'h'.repeat(513),
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<context> must be 512 characters or under', code: -8, method: creategovcfp")
  })

  it('should not createGovCfp with negative amount', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(-1),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Amount out of range', code: -3, method: creategovcfp")
  })

  it('should not createGovCfp with cycles < 1', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 0
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<cycles> should be between 1 and 3', code: -8, method: creategovcfp")
  })

  it('should not createGovCfp with cycle > 3', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 4
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: '<cycles> should be between 1 and 3', code: -8, method: creategovcfp")
  })

  it('should not createGovCfp with unknown address type', async () => {
    const data = {
      title: 'Testing another community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: '957fc0fd643f605b293'
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Address (957fc0fd643f605b293) is of an unknown type', code: -8, method: creategovcfp")
  })

  it('should createGovCfp with utxos', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const utxo = await container.fundAddress(RegTestFoundationKeys[0].owner.address, 10)
    const proposalTx = await client.governance.createGovCfp(data, [utxo])
    await container.generate(1)
    expect(typeof proposalTx).toStrictEqual('string')

    const rawtx = await container.call('getrawtransaction', [proposalTx, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not createGovCfp with wrongly formatted utxos\' txid', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data, [{ txid: 'XXXX', vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'txid must be of length 64 (not 4, for \'XXXX\')\', code: -8, method: creategovcfp')
  })

  it('should not createGovCfp with invalid utxos\' txid', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const txid = '817f1d1aa80bd908e845f747912bbc1bd29fc87f6e2bb762ead7330e1801c3cd' // random hex string of 64 char
    const promise = client.governance.createGovCfp(data, [{ txid, vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: creategovcfp')
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

  it('should not createGovCfp while still in Initial Block Download', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Cannot create a cfp while still in Initial Block Download\', code: -10, method: creategovcfp')
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

  it('should not createGovCfp with insufficient fund', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      context: 'https://github.com/DeFiCh/dfips',
      amount: new BigNumber(100),
      payoutAddress: await container.call('getnewaddress'),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: creategovcfp')
  })
})
