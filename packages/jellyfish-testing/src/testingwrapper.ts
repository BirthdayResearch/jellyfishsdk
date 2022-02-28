import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Testing, TestingGroup, TestingContainer } from '.'

export type InitDeFiContainerFn<Container> = (index: number) => Container

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TestingWrapper {
  static create<Container extends TestingContainer = MasterNodeRegTestContainer> (): Testing<Container>
  static create<Container extends TestingContainer = MasterNodeRegTestContainer> (n: 0 | 1): Testing<Container>
  static create<Container extends TestingContainer = MasterNodeRegTestContainer> (n: number): TestingGroup<Container>
  static create<Container extends TestingContainer = MasterNodeRegTestContainer> (n: 0 | 1, init: InitDeFiContainerFn<Container>): Testing<Container>
  static create<Container extends TestingContainer = MasterNodeRegTestContainer> (n: number, init: InitDeFiContainerFn<Container>): TestingGroup<Container>

  static create<Container extends TestingContainer = MasterNodeRegTestContainer> (
    n?: number,
    init: InitDeFiContainerFn<Container> = (index: number): Container => {
      return new MasterNodeRegTestContainer(RegTestFoundationKeys[index]) as Container
    }
  ): Testing<Container> | TestingGroup<Container> {
    if (n === undefined || n <= 1) {
      return Testing.create(init(0))
    }

    return TestingGroup.create(n, init)
  }

  // static group (testings: Testing<TestingContainer>[]): TestingGroup<TestingContainer> {
  //   const containers: TestingContainer[] = []

  //   testings.forEach(testing => {
  //     containers.push(testing.container)
  //   })

  //   const group = new ContainerGroup(containers)
  //   return TestingGroup.createFrom(group, testings)
  // }
}
