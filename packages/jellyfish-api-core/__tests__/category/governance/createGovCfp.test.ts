import BigNumber from 'bignumber.js'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { ProposalStatus, ProposalType } from '../../../src/category/governance'
import { ContainerAdapterClient } from '../../container_adapter_client'

const container = new MasterNodeRegTestContainer()
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

describe('On-chain governance enabled', () => {
  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await client.masternode.setGov({ ATTRIBUTES: { 'v0/params/feature/gov': 'true' } })
    await client.wallet.sendToAddress(mnAddress, 10)
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should createGovCfp without UTXOs', async () => {
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
        contextHash: '',
        type: ProposalType.COMMUNITY_FUND_PROPOSAL,
        status: ProposalStatus.VOTING,
        amount: data.amount.toNumber(),
        cycleEndHeight: expect.any(Number),
        proposalEndHeight: expect.any(Number),
        currentCycle: 1,
        totalCycles: data.cycles,
        payoutAddress: data.payoutAddress,
        proposalId: proposalTx
      })

      const burnInfo = await client.account.getBurnInfo()
      expect(burnInfo.feeburn).toStrictEqual(new BigNumber(5))
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
        contextHash: '',
        type: ProposalType.COMMUNITY_FUND_PROPOSAL,
        status: ProposalStatus.VOTING,
        amount: data.amount.toNumber(),
        cycleEndHeight: expect.any(Number),
        proposalEndHeight: expect.any(Number),
        currentCycle: 1,
        totalCycles: data.cycles,
        payoutAddress: data.payoutAddress,
        proposalId: proposalTx
      })

      const burnInfo = await client.account.getBurnInfo()
      expect(burnInfo.feeburn).toStrictEqual(new BigNumber(10))
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
        contextHash: '',
        type: ProposalType.COMMUNITY_FUND_PROPOSAL,
        status: ProposalStatus.VOTING,
        amount: data.amount.toNumber(),
        cycleEndHeight: expect.any(Number),
        proposalEndHeight: expect.any(Number),
        currentCycle: 1,
        totalCycles: data.cycles,
        payoutAddress: data.payoutAddress,
        proposalId: proposalTx
      })

      const burnInfo = await client.account.getBurnInfo()
      expect(burnInfo.feeburn).toStrictEqual(new BigNumber(15))
    }
  })

  it('should createGovCfp with UTXOs', async () => {
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
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal cycles can be between 1 and 100', code: -32600, method: creategovcfp")
  })

  it('should throw error if proposal cycles > 100', async () => {
    const data = {
      title: 'Test',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress(),
      cycles: 101
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal cycles can be between 1 and 100', code: -32600, method: creategovcfp")
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

  it('should throw error if proposal context hash exceeds 512 bytes', async () => {
    const data = {
      title: 'Test',
      amount: new BigNumber(100),
      context: '<Git issue url>',
      contextHash: 'a'.repeat(513),
      payoutAddress: await container.getNewAddress(),
      cycles: 3
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Test CreateCfpTx execution failed:\nproposal context hash cannot be more than 512 bytes', code: -32600, method: creategovcfp")
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

  it('should throw error if proposal wants to gain all money (amount exceeds 1.2B DFI)', async () => {
    const MAX_MONEY = 1200000000 * 100000000
    const data = {
      title: 'Test',
      amount: new BigNumber(MAX_MONEY + 1),
      context: '<Git issue url>',
      payoutAddress: await container.getNewAddress()
    }
    const promise = client.governance.createGovCfp(data)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow("RpcApiError: 'Invalid amount', code: -3, method: creategovcfp")
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

describe('On-chain governance while still in Initial Block Download', () => {
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

describe('On-chain governance with insufficient funds', () => {
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
