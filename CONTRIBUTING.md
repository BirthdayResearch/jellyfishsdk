# DeFi Jellyfish Contributing Guide

You need `node v14`, and `npm v7` for this project, it's required to set
up [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces).

```shell
npm install
```

## Project References

For monorepo to work seamlessly, some configuration is required. It's amazing as your code can jump across all
sub-packages, you don't need to build the project in every package when you update or clone.

Configurations required when introducing new package:

1. root-package `tsconfig.json` - `compilerOptions.paths` - add to map absolute packages name back to the source code
2. sub-package `package.json` - `scripts.build` - ensure each sub-package build script is configured
   with `tsc -b ./tsconfig.build.json`

## Testing

`jest.config.js` is set up at the root project level as well as at each submodule. You can run jest at root to test all
modules or individually at each submodule. By default, only regtest chain are used for normal testing. If you use
IntelliJ IDEA, you can right-click any file to test it individually and have it reported to the IDE.

Docker is required to run the tests as [`@defichain/testcontainers`](./packages/testcontainers) will automatically spin
up `regtest` instances for testing. The number of containers it will spin up concurrently is dependent on your
jest `--maxConcurrency` count. Test are known to be flaky due to the usage of multiple Docker containers for test
concurrency. Although testcontainers cleans up after itself, there are cases where the tests fail exceptionally you
might need to occasionally: `docker system prune --volumes`.

### Unit Testing

Unit testing are created to test each individual units/components of a software. As they are unit tests, they should
accompany each unitized component or module. They follow the naming semantic of `*.test.ts` and are placed together in
the same directory structure in `/__tests__` of the code you are testing. Code coverage is collected for this.

### End-to-end Testing

On top of unit tests, this provides additional testing that tests the entire lifecycle. All dependencies and modules are
integrated together as expected. They follow the naming semantic of `*.e2e.ts`. Code coverage is collected for this.

For API service endpoints that are meant to be consumed by developer, the testing should also be done in the `*-cient`
packages. Dogfooding at its finest.

### Sanity Testing

On top of end-to-end testing, sanity testing is done after the docker image is build. This kind of testing is performed
to ascertain the possibility of bugs within the workflow that generate the builds. To identify and determine whether a
build artifact (docker) should be rejected. This is only done on CI and you are not expected to perform them manually.

### Code coverage

Coverage is collected for all applicable tests at each pull request to main branch with `codecov`. The more testing 🚀
less 🐛 = 😎

### All features must be unit tested with accepted coverage. (Target 100%)

```txt
packages/
├─ jellyfish-*/
│  ├─ __tests__/following-src-structure.test.ts
│  └─ src/following-src-structure.ts
```

Each package or functionality must be accompanied by full coverage testing.

Due to Javascript type coercion, all test assertions must use strict equality checking.

```diff
-   expect(1).toBe('1')
-   expect(1).toEqual('1')
+   expect(1).toStrictEqual(1)
```

## Documentation

Following the idea of everything in the main branch is production ready; all pull request must be accompanied by a
documentation change under the `website/` folder. Hence, the main branch should be treated as a release with
documentations.

### TODO comments

TODO comments should usually include the author's github username in parentheses. Example:

```ts
// TODO(fuxingloh): Add tests.
```

## Publishing

`"version": "0.0.0"` is used because publishing will be done automatically
by [GitHub releases](https://github.com/DeFiCh/jellyfish/releases) with connected workflows. On
release `types: [ published, prereleased ]`, GitHub Action will automatically build all packages in this repo and
publish it into npm.

For packages with accompanying docker images, they are published automatically to GitHub Container Registry
(ghcr.io/defich). When a new [GitHub releases](https://github.com/DeFiCh/whale/releases) is triggered, GitHub Action
will automatically build the docker image in this repo and publish it. Two images are created for each release
targeting `linux/amd64` and `linux/arm64`. The latest tag will always be updated with the last release and semantic
release is enforced for each release.

## Explicit over implicit

- Each package, feature, code and decision should be explicit and well documented over implicitly guessing.
- Each test must be written explicitly as clear as possible with no implicit guessing.

## TypeScript

TypeScript must be used for all code written in this project.

### Document and maintain browser compatibility.

### Minimize dependencies (target zero)

### Do not depend on external code. (never if possible)

### Use PascalCase and period, not underscores, or dashes in filenames.

Example: Use `FooBar.ts` instead of `foo-bar.ts` or `foo_bar.ts`.

> Previously the preferred method is underscores (`foo_bar.ts`), this has be deprecated in favour of PascalCase.
> PascalCase follows the natural class naming pattern while underscores or dashes doesn't.

### Exported functions: max 2 args, put the rest into an options object.

### Use JSDoc for exported symbols.

### Top level functions should not use arrow syntax.

### `constants.ts` not allowed

It's an anti-pattern for scaling code, it gives a false impression of separation of concern. All it does is create a
mass of code concentration within project that were better separated.

> An analogy for this problem is file organization in projects. Many of us have come to agree that organizing files by
> file type (e.g. splitting everything into html, js and css folders) don't really scale. The code related to a feature
> will be forced to be split between three folders, just for a false impression of "separation of concerns". The key
> here is that "concerns" is not defined by file type. Instead, most of us opt to organize files by feature or
> responsibility. https://github.com/vuejs/rfcs/issues/55#issuecomment-504875870

## Code of conduct

Please follow the guidelines outlined at https://github.com/DeFiCh/.github/blob/main/CODE_OF_CONDUCT.md

## IntelliJ IDEA

IntelliJ IDEA is the IDE of choice for writing and maintaining this library. IntelliJ's files are included for
convenience with basic toolchain setup but use of IntelliJ is totally optional.
