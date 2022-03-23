[![CI](https://github.com/DeFiCh/whale/actions/workflows/ci.yml/badge.svg)](https://github.com/DeFiCh/whale/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/DeFiCh/whale/branch/main/graph/badge.svg?token=kBCC9qSRrA)](https://codecov.io/gh/DeFiCh/whale)
[![Maintainability](https://api.codeclimate.com/v1/badges/593ffda9c1d91261a37b/maintainability)](https://codeclimate.com/github/DeFiCh/whale/maintainability)
[![TS-Standard](https://badgen.net/badge/code%20style/ts-standard/blue?icon=typescript)](https://github.com/standard/ts-standard)

# DeFi Whale

The super index for DeFi Blockchain to simplify DeFi light implementation.

> 🚧 Work in progress, DeFi Whale is considered Alpha Software. Use at your own risk, APIs are yet not finalized.

## Developing & Contributing

Thanks for contributing, appreciate all the help we can get. Feel free to make a pull-request, we will guide you along
the way to make it merge-able. Here are some of our documented [contributing guidelines](CONTRIBUTING.md).

You need `node v14`, and `npm v7` for this project, it's required to set
up [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces).

```shell
npm install
```

### Testing

There are three types of tests required for DeFi Whale.

All types of tests required Docker
as [`@defichain/testcontainers`](https://github.com/DeFiCh/jellyfish/tree/main/packages/testcontainers) will
automatically spin up `regtest` instances for testing. The number of containers it will spin up concurrently is
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

### Publishing

Docker images are published automatically to GitHub Container Registry (ghcr.io/defich). When a
new [GitHub releases](https://github.com/DeFiCh/whale/releases) is triggered, GitHub Action will automatically build the
docker image in this repo and publish it. Two images are created for each release targeting `linux/amd64`
and `linux/arm64`. The latest tag will always be updated with the last release and semantic release is enforced for each
release.

### IntelliJ IDEA

IntelliJ IDEA is the IDE of choice for writing and maintaining this library. IntelliJ's files are included for
convenience with basic toolchain setup but use of IntelliJ is totally optional.

### Security issues

If you discover a security vulnerability in `DeFi Whale`,
[please see submit it privately](https://github.com/DeFiCh/.github/blob/main/SECURITY.md).

## License & Disclaimer

By using `DeFi Whale` (this repo), you (the user) agree to be bound by [the terms of this license](LICENSE).

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDeFiCh%2Fwhale.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FDeFiCh%2Fwhale?ref=badge_large)
