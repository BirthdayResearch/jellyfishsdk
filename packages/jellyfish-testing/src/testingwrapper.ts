import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { ContainerGroup, MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { Testing, TestingGroup, NonMNTesting } from '.'

type InitMNRegContainerFn = (index: number) => MasterNodeRegTestContainer
function defaultInitMNRegContainer (index: number): MasterNodeRegTestContainer {
  return new MasterNodeRegTestContainer(RegTestFoundationKeys[index])
}

type InitNonMNRegContainerFn = (index: number) => RegTestContainer
function defaultInitNonMNRegContainer (index: number): RegTestContainer {
  return new RegTestContainer()
}
export const TestingWrapper = new (class TestingWrapperFactory {
  create (): Testing
  create (n: 0 | 1): Testing
  create (n: number): TestingGroup
  create (n: 0 | 1, init: InitMNRegContainerFn): Testing
  create (n: number, init: InitMNRegContainerFn): TestingGroup

  create (n?: number, init: InitMNRegContainerFn = defaultInitMNRegContainer): Testing | TestingGroup {
    if (n === undefined || n <= 1) {
      return Testing.create(init(0))
    }

    return TestingGroup.create(n, init)
  }

  createNonMN (): NonMNTesting
  createNonMN (n: 0 | 1): NonMNTesting
  createNonMN (n: number): TestingGroup
  createNonMN (n: 0 | 1, init: InitNonMNRegContainerFn): NonMNTesting
  createNonMN (n: number, init: InitNonMNRegContainerFn): TestingGroup

  createNonMN (n?: number, init: InitNonMNRegContainerFn = defaultInitNonMNRegContainer): NonMNTesting | TestingGroup {
    if (n === undefined || n <= 1) {
      return NonMNTesting.create(init(0))
    }

    return TestingGroup.create(n, init)
  }

  group (testings: Testing[], nonMNTestings: NonMNTesting[]): TestingGroup {
    const containers: RegTestContainer[] = []

    testings.forEach(testing => {
      containers.push(testing.container)
    })

    nonMNTestings.forEach(nonMNTesting => {
      containers.push(nonMNTesting.container)
    })

    const group = new ContainerGroup(containers)
    return TestingGroup.createFrom(group, testings, nonMNTestings)
  }
})()
