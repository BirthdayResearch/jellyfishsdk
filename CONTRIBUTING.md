# DeFi Jellyfish Contributing Guide

## All features must be unit tested with accepted coverage. (Target 100%)

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

Each package, feature, code and decision should be explicit and well documented over implicitly guessing.

## TypeScript

TypeScript must be used for all code written in this project.

> Heavily adapted from [deno style guide](https://github.com/denoland/deno/blob/main/docs/contributing/style_guide.md).

### Document and maintain browser compatibility.

### Minimize dependencies (target zero)

### Do not depend on external code. (never if possible)

### Use underscores, not dashes in filenames.

Example: Use `foo_bar.ts` instead of `foo-bar.ts`.

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
