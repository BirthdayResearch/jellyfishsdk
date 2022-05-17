# DeFi Whale

### Testing

There are three types of tests required for DeFi Whale.

All types of tests required Docker as [`@defichain/testcontainers`](https://jellyfishsdk.com/testing/testcontainers)
will automatically spin up `regtest` instances for testing. The number of containers it will spin up concurrently is
dependent on your jest `--maxConcurrency` count. Test are known to be flaky due to the usage of multiple Docker
containers for test concurrency.

#### Unit Testing

Unit testing are created to test each individual units/components of a software. As they are unit tests, they should be
closely co-located together with the unit. They follow the naming semantic of `*.spec.ts` and placed together in the
same directory of the code you are testing. Code coverage is collected for this.

#### End-to-end Testing

On top of unit tests, this provides additional testing that tests the entire lifecycle of DeFi whale. All dependencies
and modules are integrated together as expected. They follow the naming semantic of `*.e2e.ts` and placed in the same
directory as the component. Code coverage is collected for this.

For endpoints that are meant to be consumed by developer, the testing should be done in `whale-api-cient`. Dogfooding at
its finest, tests should be written in `packages/whale-api-client/__tests__` to test the e2e aspect of each endpoint.

#### Sanity Testing

On top of end-to-end testing, sanity testing is done after the docker image is build. This kind of testing is performed
to ascertain the possibility of bugs within the workflow that generate the builds. To identify and determine whether a
build artifact (docker) should be rejected. This is only done on CI and you are not expected to perform them manually.

#### Code coverage

Coverage is collected for unit and e2e tests at each pull request to main with `codecov`; more testing 🚀 less 🐛 = 😎

```shell
jest
```
