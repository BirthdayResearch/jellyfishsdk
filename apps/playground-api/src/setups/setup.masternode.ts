import { Injectable } from '@nestjs/common'
import { PlaygroundSetup } from '../setups/setup'

interface MasternodeSetup {
  address: string
  privKey: string
}

@Injectable()
export class SetupMasternode extends PlaygroundSetup<MasternodeSetup> {
  list (): MasternodeSetup[] {
    return [
      {
        address: 'bcrt1qda8rxjyepjcj6dx82sxce3srvv4h2qcz5pjzp0',
        privKey: 'cPEKM7uMPJxbCpsjLfWuuwkQFP99DgEbBdmUX5xTppe2ibABuWWf'
      },
      {
        address: 'bcrt1qg0ppznzvc6wkp263ldwsss3w4fmx0jkg98snff',
        privKey: 'cPVwHKcMmE3YrJfdna8t33kiJfEg2oFjJSvHJimshj84xThqV9zi'
      }
    ]
  }

  async create (each: MasternodeSetup): Promise<void> {
    await this.waitForBalance(20001)
    await this.client.wallet.importPrivKey(each.privKey)
    await this.client.masternode.createMasternode(each.address)
  }

  async has (each: MasternodeSetup): Promise<boolean> {
    const nodes = await this.client.masternode.listMasternodes({ including_start: true, limit: 100 })
    return Object.values(nodes)
      .find(value => value.ownerAuthAddress === each.address) !== undefined
  }
}
