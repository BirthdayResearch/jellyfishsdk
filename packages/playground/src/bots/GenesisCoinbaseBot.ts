import { AbstractBot } from '../AbstractBot'
import { RegTestFoundationKeys, RegTest } from '@defichain/jellyfish-network'
import { EllipticPairProvider, P2WPKHTransactionBuilder, FeeRateProvider, Prevout, PrevoutProvider } from '@defichain/jellyfish-transaction-builder'
import BigNumber from 'bignumber.js'
import { Bech32, Elliptic, EllipticPair, HASH160, WIF } from '@defichain/jellyfish-crypto'
import { OP_CODES, Script, CTransactionSegWit, /* DeFiTransactionConstants, Transaction, */TransactionSegWit } from '@defichain/jellyfish-transaction'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { SmartBuffer } from 'smart-buffer'
// import { TransactionSigner } from '@defichain/jellyfish-transaction-signature'

export class CoinbaseFeeRateProvider implements FeeRateProvider {
  constructor (
    public readonly apiClient: ApiClient
  ) {
  }

  async estimate (): Promise<BigNumber> {
    const result = await this.apiClient.mining.estimateSmartFee(1)
    if (result.feerate === undefined || (result.errors !== undefined && result.errors.length > 0)) {
      return new BigNumber('0.00005000')
    }
    return new BigNumber(result.feerate)
  }
}

export class CoinbasePrevoutProvider implements PrevoutProvider {
  constructor (
    public readonly apiClient: ApiClient,
    public ellipticPair: EllipticPair
  ) {
  }

  async collect (minBalance: BigNumber): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    const address = Bech32.fromPubKey(pubKey, 'bcrt')

    const unspent: any[] = await this.apiClient.wallet.listUnspent(
      1, 9999999, { addresses: [address] }
    )

    return unspent.map((utxo: any): Prevout => {
      return CoinbasePrevoutProvider.mapPrevout(utxo, pubKey)
    })
  }

  async all (): Promise<Prevout[]> {
    const pubKey = await this.ellipticPair.publicKey()
    const unspent: any[] = await this.apiClient.wallet.listUnspent(
      1, 9999999, {
        addresses: [Bech32.fromPubKey(pubKey, 'bcrt')]
      })

    return unspent.map((utxo: any): Prevout => {
      return CoinbasePrevoutProvider.mapPrevout(utxo, pubKey)
    })
  }

  static mapPrevout (utxo: any, pubKey: Buffer): Prevout {
    return {
      txid: utxo.txid,
      vout: utxo.vout,
      value: new BigNumber(utxo.amount),
      script: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA(HASH160(pubKey), 'little')
        ]
      },
      tokenId: utxo.tokenId
    }
  }
}

export class CoinbaseEllipticPairProvider implements EllipticPairProvider {
  constructor (
    public ellipticPair: EllipticPair
  ) {
  }

  async script (): Promise<Script> {
    return {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(HASH160(await this.ellipticPair.publicKey()), 'little')
      ]
    }
  }

  get (prevout: Prevout): EllipticPair {
    return this.ellipticPair
  }
}

export class CoinbaseProviders {
  PRIV_KEY = RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.privKey
  fee: CoinbaseFeeRateProvider
  prevout: CoinbasePrevoutProvider
  elliptic: CoinbaseEllipticPairProvider
  ellipticPair: EllipticPair = Elliptic.fromPrivKey(WIF.decode(this.PRIV_KEY).privateKey)

  constructor (readonly apiClient: ApiClient) {
    this.fee = new CoinbaseFeeRateProvider(apiClient)
    this.elliptic = new CoinbaseEllipticPairProvider(this.ellipticPair)
    this.prevout = new CoinbasePrevoutProvider(apiClient, this.ellipticPair)
  }

  setEllipticPair (ellipticPair: EllipticPair): void {
    this.ellipticPair = ellipticPair
    this.elliptic.ellipticPair = this.ellipticPair
    this.prevout.ellipticPair = this.ellipticPair
  }

  async getAddress (): Promise<string> {
    const pubKey = await this.ellipticPair.publicKey()
    return Bech32.fromPubKey(pubKey, 'bcrt', 0x00)
  }
}

export class GenesisCoinbaseBot extends AbstractBot {
  static MN_KEY = RegTestFoundationKeys[RegTestFoundationKeys.length - 1]
  OWNER_ADDR = GenesisCoinbaseBot.MN_KEY.owner.address
  OWNER_PRIV = GenesisCoinbaseBot.MN_KEY.owner.privKey
  // OPERATOR_ADDR = GenesisCoinbaseBot.MN_KEY.operator.address
  // OPERATOR_PRIV = GenesisCoinbaseBot.MN_KEY.operator.privKey

  providers = new CoinbaseProviders(this.apiClient)
  builder = new P2WPKHTransactionBuilder(
    this.providers.fee,
    this.providers.prevout,
    this.providers.elliptic,
    RegTest
  )

  private async generateToAddress (): Promise<void> {
    await this.apiClient.call('generatetoaddress', [1, this.OWNER_ADDR, 1], 'number')
    await this.wait(200)
  }

  private async wait (millis: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(_ => resolve(0), millis)
    })
  }

  async fund (amount: number): Promise<void> {
    await this.apiClient.wallet.sendToAddress(this.OWNER_ADDR, amount)
    await this.generateToAddress()
  }

  async createToken (): Promise<void> {
    const list = [
      {
        create: {
          symbol: 'BTC',
          name: 'Playground BTC',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        // 0.00000785 is added for calculateFeeP2WPKH deduction, 11(total) - 1(creationFee) = 10(collateralAmount)
        fee: 11 + 0.00000785
      },
      {
        create: {
          symbol: 'ETH',
          name: 'Playground ETH',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000785
      },
      {
        create: {
          symbol: 'USDT',
          name: 'Playground USDT',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'LTC',
          name: 'Playground LTC',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000785
      },
      {
        create: {
          symbol: 'USDC',
          name: 'Playground USDC',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'CU10',
          name: 'Playground CU10',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'CD10',
          name: 'Playground CD10',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'CS25',
          name: 'Playground CS25',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      },
      {
        create: {
          symbol: 'CR50',
          name: 'Playground CR50',
          decimal: 8,
          limit: new BigNumber(0),
          isDAT: true,
          tradeable: true,
          mintable: true
        },
        fee: 11 + 0.00000795
      }
    ]

    const script = await this.providers.elliptic.script()

    for (const each of list) {
      await this.fund(each.fee)
      const tx = await this.builder.token.createToken(each.create, script)
      await this.sendTransaction(tx)
    }

    await this.generateToAddress()
  }

  async createLoanScheme (): Promise<void> {
    const list = [
      {
        ratio: 100,
        rate: new BigNumber(10),
        identifier: 'default',
        update: new BigNumber(0)
      },
      {
        ratio: 150,
        rate: new BigNumber(5),
        identifier: 'MIN150',
        update: new BigNumber(0)
      },
      {
        ratio: 175,
        rate: new BigNumber(3),
        identifier: 'MIN175',
        update: new BigNumber(0)
      },
      {
        ratio: 200,
        rate: new BigNumber(2),
        identifier: 'MIN200',
        update: new BigNumber(0)
      },
      {
        ratio: 350,
        rate: new BigNumber(1.5),
        identifier: 'MIN350',
        update: new BigNumber(0)
      },
      {
        ratio: 500,
        rate: new BigNumber(1),
        identifier: 'MIN500',
        update: new BigNumber(0)
      },
      {
        ratio: 1000,
        rate: new BigNumber(0.5),
        identifier: 'MIN10000',
        update: new BigNumber(0)
      }
    ]

    const script = await this.providers.elliptic.script()

    for (const each of list) {
      await this.fund(1)
      const tx = await this.builder.loans.setLoanScheme(each, script)
      await this.sendTransaction(tx)
    }

    await this.generateToAddress()
  }

  async setup (): Promise<void> {
    await this.createToken()
    await this.createLoanScheme()
  }

  async sendTransaction (transaction: TransactionSegWit): Promise<void> {
    const buffer = new SmartBuffer()
    new CTransactionSegWit(transaction).toBuffer(buffer)
    const hex = buffer.toBuffer().toString('hex')
    await this.apiClient.rawtx.sendRawTransaction(hex)
  }

  async bootstrap (): Promise<void> {
    await this.setup()
  }

  async cycle (n: number): Promise<void> {
  }
}

// async sendTransaction (transaction: TransactionSegWit): Promise<any> {
//   const buffer = new SmartBuffer()
//   new CTransactionSegWit(transaction).toBuffer(buffer)
//   const hex = buffer.toBuffer().toString('hex')
//   const txid = await this.apiClient.rawtx.sendRawTransaction(hex)
//   console.log('txid: ', txid)
//   // await container.generate(1)

//   // const tx = await this.apiClient.rawtx.getRawTransaction(txid, true)
//   // console.log('tx: ', tx)
//   // return tx.vout
// }

// async fund (amount: number): Promise<{ txid: string, vout: number }> {
//   const txid = await this.apiClient.wallet.sendToAddress(this.OWNER_ADDR, amount)
//   await this.generateToAddress()

//   const { vout }: {
//     vout: Array<{
//       n: number
//       scriptPubKey: {
//         addresses: string[]
//       }
//     }>
//   } = await this.apiClient.rawtx.getRawTransaction(txid, true)

//   for (const out of vout) {
//     if (out.scriptPubKey.addresses.includes(this.OWNER_ADDR)) {
//       return {
//         txid,
//         vout: out.n
//       }
//     }
//   }

//   throw new Error('getrawtransaction will always return the required vout')
// }

// async draft (): Promise<void> {
// const inputPair = WIF.asEllipticPair(this.OWNER_PRIV)
// const outputPair = WIF.asEllipticPair(this.OPERATOR_PRIV)

// const { txid, vout } = await this.fund(10)

// // Create transaction to sign
// const transaction: Transaction = {
//   version: DeFiTransactionConstants.Version,
//   vin: [
//     {
//       index: vout,
//       script: { stack: [] },
//       sequence: 0xffffffff,
//       // container.fundAddress returns in BE
//       txid: txid
//     }
//   ],
//   vout: [
//     {
//       value: new BigNumber('9.999'), // 0.001 as fees
//       script: {
//         stack: [
//           OP_CODES.OP_0,
//           OP_CODES.OP_PUSHDATA(
//             HASH160(await outputPair.publicKey()),
//             'little'
//           )
//         ]
//       },
//       tokenId: 0x00
//     }
//   ],
//   lockTime: 0x00000000
// }

// // Signing a transaction
// const signed = await TransactionSigner.sign(transaction, [{
//   prevout: {
//     value: new BigNumber(10),
//     script: {
//       stack: [
//         OP_CODES.OP_0,
//         OP_CODES.OP_PUSHDATA(
//           HASH160(await inputPair.publicKey()),
//           'little'
//         )
//       ]
//     },
//     tokenId: 0x00
//   },
//   publicKey: async () => await inputPair.publicKey(),
//   sign: async (hash) => await inputPair.sign(hash)
// }])

// // Get it as a buffer and send to container
// const buffer = new SmartBuffer()
// new CTransactionSegWit(signed).toBuffer(buffer)
// await this.apiClient.rawtx.sendRawTransaction(
//   buffer.toBuffer().toString('hex')
// )

// const unsigned = await this.apiClient.rawtx.createRawTransaction(inputs, outputs)
// const signed = await this.apiClient.rawtx.signRawTransactionWithKey(unsigned, [input.privKey])
// const txid = await this.apiClient.rawtx.sendRawTransaction(signed.hex)
// console.log('txid: ', txid)
// }

// async setupUTXO (): Promise<void> {
//   // const unsigned = await this.apiClient.rawtx.createRawTransaction(inputs, outputs)
//   // const signed = await this.apiClient.rawtx.signRawTransactionWithKey(unsigned, [input.privKey])
//   // const txid = await this.apiClient.rawtx.sendRawTransaction(signed.hex)
//   // const tx = this.apiClient.rawtx.getRawTransaction(txid, true)
//   // console.log('tx: ', tx)

//   const count = 50
//   const amounts: Record<string, number> = {}
//   for (let i = 0; i < count; i++) {
//     amounts[await this.apiClient.wallet.getNewAddress()] = 10000
//   }
//   await this.waitForBalance(10000 * count)
//   await this.apiClient.wallet.sendMany(amounts)
// }

// /**
//  * @param {number} balance to wait for wallet to reach
//  */
// protected async waitForBalance (balance: number): Promise<void> {
//   let current = await this.apiClient.wallet.getBalance()
//   while (current.lt(balance)) {
//     this.logger.info('waitForBalance', `current balance: ${current.toFixed(8)}, generate to balance: ${balance}`)
//     await this.generateToAddress()
//     current = await this.apiClient.wallet.getBalance()
//   }
// }
