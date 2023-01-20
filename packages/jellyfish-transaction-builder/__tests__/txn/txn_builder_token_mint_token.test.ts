import { StartFlags } from '@defichain/testcontainers'
import { getProviders, MockProviders } from '../provider.mock'
import { P2WPKHTransactionBuilder } from '../../src'
import { fundEllipticPair, sendTransaction } from '../test.utils'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RegTest } from '@defichain/jellyfish-network'
import { P2WPKH } from '@defichain/jellyfish-address'
import { OP_CODES, TokenMint } from '@defichain/jellyfish-transaction'
import { Bech32 } from '@defichain/jellyfish-crypto'

const attributeKey = 'ATTRIBUTES'
const symbolDBTC = 'BTC'

describe.only('Consortium', () => {
  const tGroup = TestingGroup.create(4)
  let account0: string, account1: string, account2: string, account3: string
  let idBTC: string//, idDOGE: string
  const symbolBTC = 'BTC'
  const symbolDOGE = 'DOGE'

  let providers: MockProviders
  let builder: P2WPKHTransactionBuilder

  const startFlags: StartFlags[] = [{ name: 'regtest-minttoken-simulate-mainnet', value: 1 }]

  beforeEach(async () => {
    await tGroup.start({ startFlags })

    account0 = await tGroup.get(0).generateAddress()
    account1 = await tGroup.get(1).generateAddress()
    account2 = await tGroup.get(2).generateAddress()
    account3 = await tGroup.get(3).generateAddress()

    await tGroup.get(0).token.create({
      symbol: symbolBTC,
      name: symbolBTC,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: account0
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).token.create({
      symbol: symbolDOGE,
      name: symbolDOGE,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: account0
    })
    await tGroup.get(0).generate(1)

    idBTC = await tGroup.get(0).token.getTokenId(symbolDBTC)

    providers = await getProviders(tGroup.get(0).container)
    // providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[0].owner.privKey))

    // Fund 10 DFI UTXO
    await tGroup.get(0).container.fundAddress(account0, 10)
    await tGroup.get(0).container.fundAddress(account1, 10)
    await tGroup.get(0).container.fundAddress(account2, 10)
    await tGroup.get(0).container.fundAddress(account3, 10)
    await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 100)

    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    await providers.setupMocks()
    await setupGovs()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  async function setupGovs (): Promise<void> {
    // await tGroup.get(0).rpc.masternode.setGov({
    //   [attributeKey]:
    //   {
    //     // Enable consortium
    //     'v0/params/feature/consortium': 'true',

    //     // Set a consortium global limit for dBTC
    //     [`v0/consortium/${idBTC}/mint_limit`]: '50',
    //     [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',

    //     // Set a consortium member for dBTC
    //     [`v0/consortium/${idBTC}/members`]: {
    //       '01': {
    //         name: 'Waves HQ',
    //         ownerAddress: RegTestFoundationKeys[0].owner.address,
    //         backingId: 'backing_address_btc_1_c',
    //         mintLimitDaily: '5.00000000',
    //         mintLimit: '50.00000000'
    //       }
    //     }
    //   }
    // })
    // await tGroup.get(0).generate(1)
  }

  it.only('should be able to mint tokens to an address', async () => {
    await tGroup.get(0).rpc.masternode.setGov({
      [attributeKey]:
      {
        // Enable consortium
        'v0/params/feature/consortium': 'true',
        'v0/params/feature/mint-tokens-to-address': 'true',

        // Set a consortium global limit for dBTC
        [`v0/consortium/${idBTC}/mint_limit`]: '50',
        [`v0/consortium/${idBTC}/mint_limit_daily`]: '5',

        // Set a consortium member for dBTC
        [`v0/consortium/${idBTC}/members`]: {
          '01': {
            name: 'Waves HQ',
            ownerAddress: account0,
            backingId: 'backing_address_btc_1_c',
            mintLimitDaily: '5.00000000',
            mintLimit: '50.00000000'
          }
        }
      }
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const toAddress = await tGroup.get(0).container.getNewAddress()
    const wavesColScript = P2WPKH.fromAddress(RegTest, toAddress, P2WPKH).getScript()
    const script = await providers.elliptic.script()

    const tokenMint: TokenMint = {
      // Mint 10.4 BTC
      balances: [{ token: Number(idBTC), amount: new BigNumber(10.4) }],
      to: wavesColScript
    }
    const txn = await builder.tokens.mint(tokenMint, script)

    // Ensure the created txn is correct
    const outs = await sendTransaction(tGroup.get(0).container, txn)
    const encoded: string = OP_CODES.OP_DEFI_TX_TOKEN_MINT(tokenMint).asBuffer().toString('hex')
    const pubKey = await providers.ellipticPair.publicKey()
    const address = Bech32.fromPubKey(pubKey, 'bcrt')

    expect(outs).toStrictEqual([{
      n: 0,
      scriptPubKey: {
        asm: expect.stringMatching(/^OP_RETURN 446654784d/),
        hex: `6a${encoded}`,
        type: 'nulldata'
      },
      tokenId: 0,
      value: 0
    }, {
      n: 1,
      scriptPubKey: {
        addresses: [address],
        asm: expect.any(String),
        hex: expect.any(String),
        reqSigs: 1,
        type: 'witness_v0_keyhash'
      },
      tokenId: 0,
      value: 99.9999918
    }])
    await tGroup.get(0).generate(1)

    const attr = await tGroup.get(0).rpc.masternode.getGov(attributeKey)
    expect(attr[`v0/live/economy/consortium/${idBTC}/minted`]).toStrictEqual(new BigNumber('10.4'))
    console.log({ attributes: JSON.stringify(attr), idBTC })

    const accAfter = (await tGroup.get(0).rpc.account.getAccount(toAddress))

    expect(accAfter).toStrictEqual(['10.40000000@BTC'])
  })
})
