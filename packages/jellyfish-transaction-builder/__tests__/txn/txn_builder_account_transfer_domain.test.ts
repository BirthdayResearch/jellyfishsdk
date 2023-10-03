import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { Interface, ethers } from 'ethers'
import { Testing } from '@defichain/jellyfish-testing'
import { RegTest, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import {
  OP_CODES,
  Script,
  TransferDomain
} from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
import { P2WPKH } from '@defichain/jellyfish-address'
import TransferDomainV1 from '../../../../artifacts/contracts/TransferDomainV1.sol/TransferDomainV1.json'
import waitForExpect from 'wait-for-expect'

const TD_CONTRACT_ADDR = '0xdf00000000000000000000000000000000000001'
const DST_20_CONTRACT_ADDR_BTC = '0xff00000000000000000000000000000000000001'

const TRANSFER_DOMAIN_TYPE = {
  DVM: 2,
  EVM: 3
}

const container = new MasterNodeRegTestContainer()
const testing = Testing.create(container)

let providers: MockProviders
let builder: P2WPKHTransactionBuilder

let evmRpcUrl: string
let rpc: ethers.JsonRpcProvider
let wallet: ethers.Wallet
let tdFace: Interface

let dvmAddr: string
let evmAddr: string
let dvmScript: Script
let evmScript: Script

describe('transferDomain', () => {
  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.rpc.masternode.setGov({
      ATTRIBUTES: {
        'v0/params/feature/evm': 'true',
        'v0/params/feature/transferdomain': 'true',
        'v0/transferdomain/dvm-evm/enabled': 'true',
        'v0/transferdomain/evm-dvm/enabled': 'true',
        'v0/transferdomain/dvm-evm/dat-enabled': 'true',
        'v0/transferdomain/evm-dvm/dat-enabled': 'true',
        'v0/transferdomain/dvm-evm/src-formats': ['p2pkh', 'bech32'],
        'v0/transferdomain/dvm-evm/dest-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/src-formats': ['erc55'],
        'v0/transferdomain/evm-dvm/auth-formats': ['bech32-erc55'],
        'v0/transferdomain/evm-dvm/dest-formats': ['p2pkh', 'bech32']
      }
    })
    await testing.generate(2)

    providers = await getProviders(testing.container)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey))

    // Fund 100 DFI UTXO
    await fundEllipticPair(testing.container, providers.ellipticPair, 100)
    await providers.setupMocks(true)

    dvmAddr = await providers.getAddress()
    evmAddr = await providers.getEvmAddress()
    dvmScript = await providers.elliptic.script()
    evmScript = await providers.elliptic.evmScript()

    const evmPrivKey = await testing.container.call('dumpprivkey', [evmAddr])
    wallet = new ethers.Wallet(evmPrivKey)
    tdFace = new ethers.Interface(TransferDomainV1.abi)
    evmRpcUrl = await testing.container.getCachedEvmRpcUrl()
    rpc = new ethers.JsonRpcProvider(evmRpcUrl)

    await testing.token.dfi({ address: dvmAddr, amount: 12 })
    await testing.token.create({
      symbol: 'BTC',
      name: 'BTC',
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: dvmAddr
    })
    await testing.token.create({
      symbol: 'DESC',
      name: 'DESC',
      isDAT: false,
      mintable: true,
      tradeable: false,
      collateralAddress: dvmAddr
    })
    await container.generate(1)

    await testing.token.mint({ amount: '10', symbol: 'BTC' })
    await testing.token.mint({ amount: '10', symbol: 'DESC#128' })
    await testing.generate(1)

    builder = new P2WPKHTransactionBuilder(
      providers.fee,
      providers.prevout,
      providers.elliptic,
      RegTest
    )
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  describe('transferDomain failed', () => {
    it('should fail if transfer within same domain', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmIn
        const from = evmAddr
        const to = evmAddr
        const amount = '0x8ac7230489e80000' // 10_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: dvmScript,
            amount: {
              token: 0,
              amount: new BigNumber(10)
            },
            domain: TRANSFER_DOMAIN_TYPE.DVM, // <-- same domain
            data: new Uint8Array([])
          },
          dst: {
            address: evmScript,
            amount: {
              token: 0,
              amount: new BigNumber(10)
            },
            domain: TRANSFER_DOMAIN_TYPE.DVM, // <-- same domain
            data: evmTx
          }
        }]
      }

      const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: Cannot transfer inside same domain (code 16)')
    })

    it('should fail if amount is different', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmIn
        const from = evmAddr
        const to = evmAddr
        const amount = '0x1bc16d674ec80000' // 2_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: dvmScript,
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            amount: {
              token: 0,
              amount: new BigNumber(1) // <-- not match
            },
            data: new Uint8Array([])
          },
          dst: {
            address: evmScript,
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            amount: {
              token: 0,
              amount: new BigNumber(2) // <-- not match
            },
            data: evmTx
          }
        }]
      }

      const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: Source amount must be equal to destination amount (code 16)')
    })

    it('(dvm -> evm) should fail if source address and source domain are not match', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmIn
        const from = evmAddr
        const to = evmAddr
        const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: evmScript, // <- not match
            domain: TRANSFER_DOMAIN_TYPE.DVM, // <- not match
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            data: new Uint8Array([])
          },
          dst: {
            address: dvmScript,
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            data: evmTx
          }
        }]
      }

      const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: Src address must be a legacy or Bech32 address in case of "DVM" domain (code 16)\', code: -26')
    })

    it('(evm -> dvm) should fail if source address and source domain are not match', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmOut
        const from = evmAddr
        const to = TD_CONTRACT_ADDR
        const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: dvmScript, // <- not match
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.EVM, // <- not match
            data: new Uint8Array([])
          },
          dst: {
            address: dvmScript,
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            data: evmTx
          }
        }]
      }

      const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: Src address must be an ERC55 address in case of "EVM" domain (code 16)\', code: -26')
    })

    it('(dvm -> evm) should fail if destination address and destination domain are not match', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmIn
        const from = evmAddr
        const to = evmAddr
        const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: dvmScript,
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            data: new Uint8Array([])
          },
          dst: {
            address: dvmScript, // <- not match
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.EVM, // <- not match
            data: evmTx
          }
        }]
      }

      const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: Dst address must be an ERC55 address in case of "EVM" domain (code 16)')
    })

    it('(evm -> dvm) should fail if destination address and destination domain are not match', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmOut
        const from = evmAddr
        const to = TD_CONTRACT_ADDR
        const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: evmScript,
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            data: new Uint8Array([])
          },
          dst: {
            address: evmScript, // <- not match
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.DVM, // <- not match
            data: evmTx
          }
        }]
      }

      const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: Dst address must be a legacy or Bech32 address in case of "DVM" domain (code 16)\', code: -26')
    })

    it('(dvm -> evm) should fail if address is not owned', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmIn
        const from = evmAddr
        const to = evmAddr
        const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      const invalidDvmScript = P2WPKH.fromAddress(RegTest, await testing.container.getNewAddress(), P2WPKH).getScript()

      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: invalidDvmScript,
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            data: new Uint8Array([])
          },
          dst: {
            address: evmScript,
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            data: evmTx
          }
        }]
      }

      const txn = await builder.account.transferDomain(transferDomain, invalidDvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('DeFiDRpcError: \'TransferDomainTx: tx must have at least one input from account owner (code 16)')
    })

    it('should not transfer if custom (isDAT = false) token is transferred', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmIn
        const from = evmAddr
        const to = evmAddr
        const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      const invalidDvmScript = P2WPKH.fromAddress(RegTest, await testing.container.getNewAddress(), P2WPKH).getScript()
      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: dvmScript,
            amount: {
              token: 128, // <- DESC
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            data: new Uint8Array([])
          },
          dst: {
            address: evmScript,
            amount: {
              token: 128, // <- DESC
              amount: new BigNumber(3)
            },
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            data: evmTx
          }
        }]
      }

      const txn = await builder.account.transferDomain(transferDomain, invalidDvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('Non-DAT or LP tokens are not supported for transferdomain')
    })

    it('should fail (duo) transfer domain from DVM to EVM', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmIn
        const from = evmAddr
        const to = evmAddr
        const amount = '0x1bc16d674ec80000' // 2_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      let evmTx1 = new Uint8Array([0])
      {
        // EvmIn
        const from = evmAddr
        const to = evmAddr
        const amount = '0x14d1120d7b160000' // 1_500_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx1 = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      const transferDomain: TransferDomain = {
        items: [{
          src: {
            address: dvmScript,
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            amount: {
              token: 0,
              amount: new BigNumber(2)
            },
            data: new Uint8Array([])
          },
          dst: {
            address: evmScript,
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            amount: {
              token: 0,
              amount: new BigNumber(2)
            },
            data: evmTx
          }
        }, {
          src:
          {
            address: dvmScript,
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            amount: {
              token: 0,
              amount: new BigNumber(1.5)
            },
            data: new Uint8Array([])
          },
          dst: {
            address: evmScript,
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            amount: {
              token: 0,
              amount: new BigNumber(1.5)
            },
            data: evmTx1
          }
        }]
      }

      const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('TransferDomain currently only supports a single transfer per transaction')
    })

    it('should fail (duo) transfer domain from EVM to DVM', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmOut
        const from = evmAddr
        const to = TD_CONTRACT_ADDR
        const amount = '0x1bc16d674ec80000' // 2_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      let evmTx1 = new Uint8Array([0])
      {
        // EvmOut
        const from = evmAddr
        const to = TD_CONTRACT_ADDR
        const amount = '0x14d1120d7b160000' // 1_500_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx1 = new Uint8Array(Buffer.from(signed, 'hex'))
      }
      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: evmScript,
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            amount: {
              token: 0,
              amount: new BigNumber(2)
            },
            data: new Uint8Array([])
          },
          dst: {
            address: dvmScript,
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            amount: {
              token: 0,
              amount: new BigNumber(2)
            },
            data: evmTx
          }
        },
        {
          src:
          {
            address: evmScript,
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            amount: {
              token: 0,
              amount: new BigNumber(1.5)
            },
            data: new Uint8Array([])
          },
          dst: {
            address: dvmScript,
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            amount: {
              token: 0,
              amount: new BigNumber(1.5)
            },
            data: evmTx1
          }
        }
        ]
      }

      const txn = await builder.account.transferDomain(transferDomain, dvmScript)
      const promise = sendTransaction(testing.container, txn)

      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('TransferDomain currently only supports a single transfer per transaction')
    })

    it('should fail (duo-diff) Transfer Domain from EVM to DVM and DVM to EVM', async () => {
      let evmTx = new Uint8Array([])
      {
        // EvmIn
        const from = evmAddr
        const to = evmAddr
        const amount = '0x3782dace9d900000' // 4_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
      }

      let evmTx1 = new Uint8Array([0])
      {
        // EvmOut
        const from = evmAddr
        const to = TD_CONTRACT_ADDR
        const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
        const native = dvmAddr
        const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
        const nonce = await rpc.getTransactionCount(evmAddr)

        const tx: ethers.TransactionRequest = {
          to: TD_CONTRACT_ADDR,
          nonce: nonce,
          data: data,
          chainId: (await rpc.getNetwork()).chainId,
          value: 0,
          gasLimit: 0,
          gasPrice: 0
        }

        const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

        evmTx1 = new Uint8Array(Buffer.from(signed, 'hex'))
      }
      const transferDomain: TransferDomain = {
        items: [{
          src:
          {
            address: dvmScript,
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            amount: {
              token: 0,
              amount: new BigNumber(4)
            },
            data: new Uint8Array([])
          },
          dst: {
            address: evmScript,
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            amount: {
              token: 0,
              amount: new BigNumber(4)
            },
            data: evmTx
          }
        },
        {
          src:
          {
            address: evmScript,
            domain: TRANSFER_DOMAIN_TYPE.EVM,
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            data: new Uint8Array([])
          },
          dst: {
            address: dvmScript,
            domain: TRANSFER_DOMAIN_TYPE.DVM,
            amount: {
              token: 0,
              amount: new BigNumber(3)
            },
            data: evmTx1
          }
        }
        ]
      }

      const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
      const promise = sendTransaction(testing.container, txn)
      await expect(promise).rejects.toThrow(DeFiDRpcError)
      await expect(promise).rejects.toThrow('TransferDomain currently only supports a single transfer per transaction')
    })
  })

  it('should transfer domain from DVM to EVM', async () => {
    const dvmAccBefore = await testing.rpc.account.getAccount(dvmAddr)
    const [dvmBalanceBefore0, tokenIdBefore0] = dvmAccBefore[0].split('@')

    let evmTx = new Uint8Array([])
    {
      // EvmIn
      const from = TD_CONTRACT_ADDR
      const to = evmAddr
      const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
      const native = dvmAddr
      const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
      const nonce = await rpc.getTransactionCount(evmAddr)

      const tx: ethers.TransactionRequest = {
        to: TD_CONTRACT_ADDR,
        nonce: nonce,
        data: data,
        chainId: (await rpc.getNetwork()).chainId,
        type: 0,
        value: 0,
        gasLimit: 0,
        gasPrice: 0
      }

      const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

      evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
    }

    const transferDomain: TransferDomain = {
      items: [{
        src:
        {
          address: dvmScript,
          domain: TRANSFER_DOMAIN_TYPE.DVM,
          amount: {
            token: 0,
            amount: new BigNumber(3)
          },
          data: new Uint8Array([])
        },
        dst: {
          address: evmScript,
          domain: TRANSFER_DOMAIN_TYPE.EVM,
          amount: {
            token: 0,
            amount: new BigNumber(3)
          },
          data: evmTx
        }
      }]
    }
    // NOTE(canonbrother): `maximumAmount` is a workaround to grab only single vin
    // since maximumCount behaviour does not return by provided value
    // but catch up total utxos of the tokenId
    const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
    const outs = await sendTransaction(container, txn)
    const encoded: string = OP_CODES.OP_DEFI_TX_TRANSFER_DOMAIN(transferDomain).asBuffer().toString('hex')
    const expectedTransferDomainScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547838')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedTransferDomainScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(dvmAddr)

    const dvmAccAfter = await testing.rpc.account.getAccount(dvmAddr)
    const [dvmBalanceAfter0, tokenIdAfter0] = dvmAccAfter[0].split('@')
    expect(tokenIdBefore0).toStrictEqual(tokenIdAfter0)

    // check: dvm balance is transferred
    expect(new BigNumber(dvmBalanceAfter0))
      .toStrictEqual(new BigNumber(dvmBalanceBefore0).minus(3))
  })

  it('should transfer domain from EVM to DVM', async () => {
    await waitForExpect(async () => {
      const nonce = await rpc.getTransactionCount(evmAddr)
      expect(nonce).toStrictEqual(1)
    }, 100_000)

    const dvmAccBefore = await testing.rpc.account.getAccount(dvmAddr)
    const [dvmBalanceBefore0, tokenIdBefore0] = dvmAccBefore[0].split('@')
    const prevBalance = await getEVMBalances(testing)

    let evmTx = new Uint8Array([])
    {
      // EvmOut
      const from = evmAddr
      const to = TD_CONTRACT_ADDR
      const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
      const native = dvmAddr
      const data = tdFace.encodeFunctionData('transfer', [from, to, amount, native])
      const nonce = await rpc.getTransactionCount(evmAddr)

      const tx: ethers.TransactionRequest = {
        to: TD_CONTRACT_ADDR,
        nonce: nonce,
        data: data,
        chainId: (await rpc.getNetwork()).chainId,
        type: 0,
        value: 0,
        gasLimit: 0,
        gasPrice: 0
      }

      const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

      evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
    }

    const transferDomain: TransferDomain = {
      items: [{
        src:
        {
          address: evmScript,
          domain: TRANSFER_DOMAIN_TYPE.EVM,
          amount: {
            token: 0,
            amount: new BigNumber(3)
          },
          data: evmTx
        },
        dst: {
          address: dvmScript,
          domain: TRANSFER_DOMAIN_TYPE.DVM,
          amount: {
            token: 0,
            amount: new BigNumber(3)
          },
          data: new Uint8Array([])
        }
      }]
    }

    const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
    const outs = await sendTransaction(container, txn)
    const encoded: string = OP_CODES.OP_DEFI_TX_TRANSFER_DOMAIN(transferDomain).asBuffer().toString('hex')
    const expectedTransferDomainScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547838')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedTransferDomainScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(dvmAddr)

    const dvmAccAfter = await testing.rpc.account.getAccount(dvmAddr)
    const [dvmBalanceAfter0, tokenIdAfter0] = dvmAccAfter[0].split('@')
    expect(tokenIdBefore0).toStrictEqual(tokenIdAfter0)

    // check: dvm balance is updated
    expect(new BigNumber(dvmBalanceAfter0))
      .toStrictEqual(new BigNumber(dvmBalanceBefore0).plus(3))

    // check evm balance to be equal to zero
    const currentBalance = await getEVMBalances(testing)
    expect(new BigNumber(prevBalance))
      .toStrictEqual(new BigNumber(currentBalance).plus(3))
  })

  it('should transfer domain dToken from DVM to EVM', async () => {
    await waitForExpect(async () => {
      const nonce = await rpc.getTransactionCount(evmAddr)
      expect(nonce).toStrictEqual(2)
    }, 100_000)

    const dvmAccBefore = await testing.rpc.account.getAccount(dvmAddr)
    const [dvmBalanceBefore0, tokenIdBefore0] = dvmAccBefore[1].split('@')

    let evmTx = new Uint8Array([])
    {
      // EvmIn
      const from = TD_CONTRACT_ADDR
      const to = evmAddr
      const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
      const native = dvmAddr
      const data = tdFace.encodeFunctionData('transferDST20', [DST_20_CONTRACT_ADDR_BTC, from, to, amount, native])
      const nonce = await rpc.getTransactionCount(evmAddr)

      const tx: ethers.TransactionRequest = {
        to: TD_CONTRACT_ADDR,
        nonce: nonce,
        data: data,
        chainId: (await rpc.getNetwork()).chainId,
        type: 0,
        value: 0,
        gasLimit: 0,
        gasPrice: 0
      }

      const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

      evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
    }

    const transferDomain: TransferDomain = {
      items: [{
        src:
        {
          address: dvmScript,
          domain: TRANSFER_DOMAIN_TYPE.DVM,
          amount: {
            token: 1, // <- BTC
            amount: new BigNumber(3)
          },
          data: new Uint8Array([])
        },
        dst: {
          address: evmScript,
          domain: TRANSFER_DOMAIN_TYPE.EVM,
          amount: {
            token: 1, // <- BTC
            amount: new BigNumber(3)
          },
          data: evmTx
        }
      }]
    }

    const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
    const outs = await sendTransaction(container, txn)
    const encoded: string = OP_CODES.OP_DEFI_TX_TRANSFER_DOMAIN(transferDomain).asBuffer().toString('hex')
    const expectedTransferDomainScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547838')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedTransferDomainScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(dvmAddr)

    const dvmAccAfter = await testing.rpc.account.getAccount(dvmAddr)
    const [dvmBalanceAfter0, tokenIdAfter0] = dvmAccAfter[1].split('@')
    expect(tokenIdBefore0).toStrictEqual(tokenIdAfter0)

    // check: dvm balance is transferred
    expect(new BigNumber(dvmBalanceAfter0))
      .toStrictEqual(new BigNumber(dvmBalanceBefore0).minus(3))
  })

  it('should transfer domain dToken from EVM to DVM', async () => {
    await waitForExpect(async () => {
      const nonce = await rpc.getTransactionCount(evmAddr)
      expect(nonce).toStrictEqual(3)
    }, 100_000)

    const dvmAccBefore = await testing.rpc.account.getAccount(dvmAddr)
    const [dvmBalanceBefore0, tokenIdBefore0] = dvmAccBefore[1].split('@')

    let evmTx = new Uint8Array([])
    {
      // EvmOut
      const from = evmAddr
      const to = TD_CONTRACT_ADDR
      const amount = '0x29a2241af62c0000' // 3_000_000_000_000_000_000
      const native = dvmAddr
      const data = tdFace.encodeFunctionData('transferDST20', [DST_20_CONTRACT_ADDR_BTC, from, to, amount, native])
      const nonce = await rpc.getTransactionCount(evmAddr)

      const tx: ethers.TransactionRequest = {
        to: TD_CONTRACT_ADDR,
        nonce: nonce,
        data: data,
        chainId: (await rpc.getNetwork()).chainId,
        type: 0,
        value: 0,
        gasLimit: 0,
        gasPrice: 0
      }

      const signed = (await wallet.signTransaction(tx)).substring(2) // rm prefix `0x`

      evmTx = new Uint8Array(Buffer.from(signed, 'hex'))
    }

    const transferDomain: TransferDomain = {
      items: [{
        src:
        {
          address: evmScript,
          domain: TRANSFER_DOMAIN_TYPE.EVM,
          amount: {
            token: 1,
            amount: new BigNumber(3)
          },
          data: evmTx
        },
        dst: {
          address: dvmScript,
          domain: TRANSFER_DOMAIN_TYPE.DVM,
          amount: {
            token: 1,
            amount: new BigNumber(3)
          },
          data: new Uint8Array([])
        }
      }]
    }

    const txn = await builder.account.transferDomain(transferDomain, dvmScript, { maximumAmount: 50 })
    const outs = await sendTransaction(container, txn)
    const encoded: string = OP_CODES.OP_DEFI_TX_TRANSFER_DOMAIN(transferDomain).asBuffer().toString('hex')
    const expectedTransferDomainScript = `6a${encoded}`

    expect(outs.length).toStrictEqual(2)
    expect(outs[0].value).toStrictEqual(0)
    expect(outs[0].n).toStrictEqual(0)
    expect(outs[0].tokenId).toStrictEqual(0)
    expect(outs[0].scriptPubKey.asm.startsWith('OP_RETURN 4466547838')).toStrictEqual(true)
    expect(outs[0].scriptPubKey.hex).toStrictEqual(expectedTransferDomainScript)
    expect(outs[0].scriptPubKey.type).toStrictEqual('nulldata')

    expect(outs[1].value).toEqual(expect.any(Number))
    expect(outs[1].n).toStrictEqual(1)
    expect(outs[1].tokenId).toStrictEqual(0)
    expect(outs[1].scriptPubKey.type).toStrictEqual('witness_v0_keyhash')
    expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(dvmAddr)

    const dvmAccAfter = await testing.rpc.account.getAccount(dvmAddr)
    const [dvmBalanceAfter0, tokenIdAfter0] = dvmAccAfter[1].split('@')
    expect(tokenIdBefore0).toStrictEqual(tokenIdAfter0)

    // check: dvm balance is updated
    expect(new BigNumber(dvmBalanceAfter0))
      .toStrictEqual(new BigNumber(dvmBalanceBefore0).plus(3))
  })
})

async function getEVMBalances (testing: Testing): Promise<BigNumber> {
  const withoutEthRes = await testing.rpc.account.getTokenBalances({}, false)
  const [withoutEth] = withoutEthRes[0].split('@')
  const withEthRes = await testing.rpc.account.getTokenBalances({}, false, { symbolLookup: false, includeEth: true })
  const [withEth] = withEthRes[0].split('@')
  return new BigNumber(withEth).minus(withoutEth)
}
