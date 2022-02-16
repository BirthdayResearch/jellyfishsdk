import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { ContainerGroup, DeFiDContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing, TestingGroup } from '.'

type InitDeFiContainerFn = (index: number) => DeFiDContainer
function defaultInitDeFiContainer (index: number): DeFiDContainer {
  return new MasterNodeRegTestContainer(RegTestFoundationKeys[index])
}
export const TestingWrapper = new (class TestingWrapperFactory {
  create (): Testing
  create (n: 0 | 1): Testing
  create (n: number): TestingGroup
  create (n: 0 | 1, init: InitDeFiContainerFn): Testing
  create (n: number, init: InitDeFiContainerFn): TestingGroup

  create (n?: number, init: InitDeFiContainerFn = defaultInitDeFiContainer): Testing | TestingGroup {
    if (n === undefined || n <= 1) {
      return Testing.createBase(init(0))
    }

    return TestingGroup.create(n, init)
  }

  group (testings: Testing[]): TestingGroup {
    const containers: DeFiDContainer[] = []

    testings.forEach(testing => {
      containers.push(testing.container)
    })

    const group = new ContainerGroup(containers)
    return new TestingGroup(group, testings)
  }
})()
