import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { DeFiDContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing, TestingGroup } from '.'

export class TestingWrapper {
  create (): Testing
  create (n: number): TestingGroup
  create (n: number, init: (index: number) => DeFiDContainer): Testing | TestingGroup

  create (n?: number, init?: (index: number) => DeFiDContainer): Testing | TestingGroup {
    if (init === undefined) {
      init = (index: number) => new MasterNodeRegTestContainer(RegTestFoundationKeys[index])
    }

    if (n === undefined || n <= 1) {
      return Testing.createBase(init(0))
    }

    return TestingGroup.create(n, init)
  }
}
