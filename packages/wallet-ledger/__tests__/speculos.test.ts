import Transport from "@ledgerhq/hw-transport"
// @ts-ignore because @ledgerhq uses flow
import SpeculosTransport from "@ledgerhq/hw-transport-node-speculos";
import { BIP32Path } from "../src/bip32_path";

const apduPort = 40000;

describe('spec', () => {
  it('should exampleSimple()', async () => {
    const transport: Transport = await SpeculosTransport.open({ apduPort });
    const res = await transport.send(0xe0, 0xc4, 0x00, 0x00);
    console.log(res)
  });

  it('should getAddress', async () => {
    const transport: Transport = await SpeculosTransport.open({ apduPort });
    const bip32Path = BIP32Path.fromString(`m/0'/0'/0'/0/0`)
    const res = await transport.send(0xe0, 0x40, 0x00, 0x00, bip32Path.asBuffer());
    console.log(res)
  });
})


async function exampleAdvanced () {
  const transport = await SpeculosTransport.open({ apduPort });
  setTimeout(() => {
    // in 1s i'll click on right button and release
    transport.button("Rr");
  }, 1000); // 1s is a tradeoff here. In future, we need to be able to "await & expect a text" but that will need a feature from speculos to notify us when text changes.
  // derivate btc address and ask for device verification
  const res = await transport.send(0xE0, 0x40, 0x00, 0x00, Buffer.from("058000002c8000000080000000000000000000000f"));
}
