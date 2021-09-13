# DeFi Jellyfish Contributing Guide

## All features must be unit tested with accepted coverage. (Target 100%)

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

## TODO comments

TODO comments should usually include the author's github username in parentheses. Example:

```ts
// TODO(fuxingloh): Add tests.
```

## Code of conduct

Please follow the guidelines outlined at https://github.com/DeFiCh/.github/blob/main/CODE_OF_CONDUCT.md

## Documentation

Each pull request with feature change should have accompanying documentations under the `website/` folder.

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
