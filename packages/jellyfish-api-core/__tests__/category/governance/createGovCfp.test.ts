import BigNumber from 'bignumber.js'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { GovernanceMasterNodeRegTestContainer } from './governance_container'
import { ContainerAdapterClient } from '../../container_adapter_client'

const container = new GovernanceMasterNodeRegTestContainer()
const client = new ContainerAdapterClient(container)
const mnAddress = RegTestFoundationKeys[0].owner.address

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
      title: 'Testing another community fund proposal',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress(),
      cycles: 0
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot create tx, on-chain governance is not enabled')
  })
})

describe('On-chain governance enabled - success cases', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/governance/global/enabled': 'true' } })
    await client.wallet.sendToAddress(mnAddress, 10)
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should createGovCfp - without UTXOs', async () => {
    const burnInfo = await client.account.getBurnInfo()
    expect(burnInfo.feeburn).toStrictEqual(new BigNumber(0))

    // Create cfp with p2sh-segwit address
    {
      const data = {
        title: 'Test',
        context: '<Git issue url>',
        amount: new BigNumber(100),
        payoutAddress: await container.getNewAddress('', 'p2sh-segwit'),
        cycles: 2
      }

      const proposalTx = await client.governance.createGovCfp(data)
      await container.generate(1)

      const proposal = await container.call('getgovproposal', [proposalTx])
      expect(proposal).toStrictEqual({
        title: data.title,
        context: data.context,
        type: ProposalType.COMMUNITY_FUND_PROPOSAL,
        status: ProposalStatus.VOTING,
        amount: data.amount.toNumber(),
        finalizeAfter: expect.any(Number),
        nextCycle: 1,
        totalCycles: data.cycles,
        payoutAddress: data.payoutAddress,
        proposalId: proposalTx
      })

      const burnInfo = await client.account.getBurnInfo()
      expect(burnInfo.feeburn).toStrictEqual(new BigNumber(1))
    }

    // Create cfp with legacy address
    {
      const data = {
        title: 'Test',
        context: '<Git issue url>',
        amount: new BigNumber(100),
        payoutAddress: await container.getNewAddress('', 'legacy'),
        cycles: 2
      }
      const proposalTx = await client.governance.createGovCfp(data)
      await container.generate(1)

      const proposal = await container.call('getgovproposal', [proposalTx])
      expect(proposal).toStrictEqual({
        title: data.title,
        context: data.context,
        type: ProposalType.COMMUNITY_FUND_PROPOSAL,
        status: ProposalStatus.VOTING,
        amount: data.amount.toNumber(),
        finalizeAfter: expect.any(Number),
        nextCycle: 1,
        totalCycles: data.cycles,
        payoutAddress: data.payoutAddress,
        proposalId: proposalTx
      })

      const burnInfo = await client.account.getBurnInfo()
      expect(burnInfo.feeburn).toStrictEqual(new BigNumber(2))
    }

    // Create cfp with bech32 address
    {
      const data = {
        title: 'Testing new cfp with bech32 address',
        context: '<Git issue url>',
        amount: new BigNumber(100),
        payoutAddress: await container.getNewAddress('', 'bech32'),
        cycles: 2
      }
      const proposalTx = await client.governance.createGovCfp(data)
      await container.generate(1)

      const proposal = await container.call('getgovproposal', [proposalTx])
      expect(proposal).toStrictEqual({
        title: data.title,
        context: data.context,
        type: ProposalType.COMMUNITY_FUND_PROPOSAL,
        status: ProposalStatus.VOTING,
        amount: data.amount.toNumber(),
        finalizeAfter: expect.any(Number),
        nextCycle: 1,
        totalCycles: data.cycles,
        payoutAddress: data.payoutAddress,
        proposalId: proposalTx
      })

      const burnInfo = await client.account.getBurnInfo()
      expect(burnInfo.feeburn).toStrictEqual(new BigNumber(3))
    }
  })

  it('should createGovCfp - with UTXOs', async () => {
    const data = {
      title: 'Test',
      context: '<Git issue url>',
      amount: new BigNumber(100),
      payoutAddress: mnAddress,
      cycles: 2
    }
    const utxo = await container.fundAddress(mnAddress, 10)

    const proposalTx = await client.governance.createGovCfp(data, [utxo])
    await container.generate(1)

    const rawtx = await client.rawtx.getRawTransaction(proposalTx, true)
    expect(typeof proposalTx).toStrictEqual('string')
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })
})

describe('On-chain governance enabled - error cases', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/governance/global/enabled': 'true' } })
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if proposal cycles < 1', async () => {
    const data = {
      title: 'Test',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress(),
      cycles: 0
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('proposal cycles can be between 1 and 3')
  })

  it('should throw error if proposal cycles > 3', async () => {
    const data = {
      title: 'Test',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress(),
      cycles: 4
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal cycles can be between 1 and 3', code: -32600, method: creategovcfp")
  })

  it('should throw error if proposal title exceeds 128 bytes', async () => {
    const data = {
      title: 'a'.repeat(129),
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress(),
      cycles: 3
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal title cannot be more than 128 bytes', code: -32600, method: creategovcfp")
  })

  it('should throw error if proposal title is empty', async () => {
    const data = {
      title: '',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress(),
      cycles: 3
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal title must not be empty', code: -32600, method: creategovcfp")
  })

  it('should throw error if proposal context exceeds 512 bytes', async () => {
    const data = {
      title: 'Test',
      amount: new BigNumber(100),
      context: 'a'.repeat(513),
      payoutAddress: await container.getNewAddress(),
      cycles: 3
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal context cannot be more than 512 bytes', code: -32600, method: creategovcfp")
  })

  it('should throw error if proposal context is empty', async () => {
    const data = {
      title: 'Test',
      amount: new BigNumber(100),
      context: '',
      payoutAddress: await container.getNewAddress(),
      cycles: 3
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal context must not be empty', code: -32600, method: creategovcfp")
  })

  it('should throw error if address is of an unknown type', async () => {
    const data = {
      title: 'Test',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: '957fc0fd643f605b293'
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Address (957fc0fd643f605b293) is of an unknown type', code: -8, method: creategovcfp")
  })

  it('should throw error if amount is negative', async () => {
    const data = {
      title: 'Test',
      amount: new BigNumber(-1),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress()
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Amount out of range', code: -3, method: creategovcfp")
  })

  it('should throw error if utxo format is invalid', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress(),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data, [{ txid: 'XXXX', vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'txid must be of length 64 (not 4, for \'XXXX\')\', code: -8, method: creategovcfp')
  })

  it('should throw error if utxos\' txid is invalid', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress(),
      cycles: 2
    }
    const txid = '817f1d1aa80bd908e845f747912bbc1bd29fc87f6e2bb762ead7330e1801c3cd' // random hex string of 64 char
    const promise = client.governance.createGovCfp(data, [{ txid, vout: 1 }])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Insufficient funds\', code: -4, method: creategovcfp')
  })

  it('should throw error if utxo transaction does not have at least one input from proposal account', async () => {
    const data = {
      title: 'Test',
      context: '<Git issue url>',
      amount: new BigNumber(100),
      payoutAddress: await container.getNewAddress(),
      cycles: 2
    }
    const utxo = await container.fundAddress(mnAddress, 10)

    const promise = client.governance.createGovCfp(data, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\ntx must have at least one input from proposal account', code: -32600, method: creategovcfp")
  })
})

describe('On-chain governance - still in Initial Block Download', () => {
  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if still in Initial Block Download', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      context: '<Git issue url>',
      amount: new BigNumber(100),
      payoutAddress: await container.getNewAddress(),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Cannot create a cfp while still in Initial Block Download\', code: -10, method: creategovcfp')
  })
})

describe('On-chain governance - insufficient funds', () => {
  beforeAll(async () => {
    await container.start()
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if insufficient funds', async () => {
    const data = {
      title: 'Testing new community fund proposal',
      context: '<Git issue url>',
      amount: new BigNumber(100),
      payoutAddress: await container.getNewAddress(),
      cycles: 2
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Add-on auth TX failed: Insufficient funds\', code: -4, method: creategovcfp')
  })
})
