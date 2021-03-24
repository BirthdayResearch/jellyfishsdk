import { HdNode } from "@defichain/wallet-coin";
import Transport from "@ledgerhq/hw-transport"
import { BIP32Path } from "./bip32_path";

/**
 * Instructions mapping for ledger, following the specification of
 * https://github.com/DeFiCh/defi-ledger-app/tree/master/src
 */
const MAPPINGS = {
  GET_VERSION: 0x01,

  /**
   * This command returns the public key and Base58 encoded address for the given BIP 32 path.
   * TODO(fuxingloh): specification drift
   *  src/defi_get_pubkey.c#L206-L208
   *
   * INPUT DATA
   * |  Description                                      | Length |
   * +---------------------------------------------------+--------+
   * |  Number of BIP 32 derivations to perform (max 10) | 1      |
   * |  First derivation index (big endian)              | 4      |
   * |  Next derivation index... (big endian)            | 4      |
   *
   * @see BIP32Path.asBuffer()
   *
   * OUTPUT DATA
   * |  Description                    | Length |
   * +---------------------------------+--------+
   * |  Public Key length              | 1      |
   * |  Uncompressed Public Key        | var    |
   * |  Base58 bitcoin address length  | 1      |
   * |  Base58 encoded bitcoin address | var    |
   * |  BIP32 Chain code               | 32     |
   */
  GET_WALLET_PUBLIC_KEY: {
    CLA: 0xe0,
    INS: 0x02,
    P1: {
      DISPLAY_FALSE: 0x00,
      DISPLAY_TRUE: 0x01,
    },
    P2: {
      Legacy: 0x00,
      P2SH_P2WPKH: 0x01,
      BECH32: 0x02,
      CASH_ADDR: 0x03,
    }
  }
}

export class LedgerHdNode implements HdNode<LedgerHdNode> {

  private readonly transport: Transport<any>

  constructor (transport: Transport<any>) {
    this.transport = transport;
  }

  async publicKey (): Promise<Buffer> {
    // TODO(fuxingloh): LiteNode address implementation
    const bip32Path = BIP32Path.fromString('')

    // const buffer = bip32asBuffer(path);
    // var p1 = verify ? 1 : 0;
    // var p2 = addressFormatMap[format];
    const response: Buffer = await this.transport.send(
      MAPPINGS.GET_WALLET_PUBLIC_KEY.CLA,
      MAPPINGS.GET_WALLET_PUBLIC_KEY.INS,
      MAPPINGS.GET_WALLET_PUBLIC_KEY.P1.DISPLAY_FALSE,
      MAPPINGS.GET_WALLET_PUBLIC_KEY.P2.BECH32,
      bip32Path.asBuffer()
    );

    // [length,pubKey,...]
    const publicKeyLength = response[0]
    return response.slice(1, 1 + publicKeyLength)
  }

  // TODO(fuxingloh): remove private key to keep HdNode private keyless
  async privateKey (): Promise<Buffer> {
    throw new Error("private key do not leave the ledger");
  }

  // TODO(fuxingloh): derive logic will be simplified to use a LiteNode approach

  async derive (index: number): Promise<LedgerHdNode> {
    throw new Error()
  }

  async deriveHardened (index: number): Promise<LedgerHdNode> {
    throw new Error()
  }

  async derivePath (path: string): Promise<LedgerHdNode> {
    throw new Error()
  }

  // TODO(fuxingloh): sign

  /**
   * @param hash
   * @param lowR is ignored as HW ledger do not support it yet
   */
  async sign (hash: Buffer, lowR?: boolean | undefined): Promise<Buffer> {
    throw new Error()
  }

  // TODO(fuxingloh): transaction signing?

  // TODO(fuxingloh): remove verify signature for reduce complexity
  async verify (hash: Buffer, signature: Buffer): Promise<boolean> {
    throw new Error()
  }
}
