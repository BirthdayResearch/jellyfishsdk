# DeFiChain Jellyfish Contributing Guide

## All features must be united tested with accepted coverage. (Target 100%)

Each package or functionality must be accompanied by full coverage testing.

## TODO comments

TODO comments should usually include the author's github username in parentheses. Example:

```ts
// TODO(fuxingloh): Add tests.
```

## Code of conduct

Please follow the guidelines outlined at https://github.com/DeFiCh/.github/blob/main/CODE_OF_CONDUCT.md

## Documentation

Each pull request with feature change should have accompanying documentations under the `docs/` folder.

## Explicit over implicit

Each package, feature, code and decision should be explicit and well documented over implicitly guessing.

## TypeScript

TypeScript must be used for all code written in this project. There are plans to
target [Deno](https://github.com/denoland/deno) runtime, but it's not actively in development yet.

> Heavily adapted from [Deno style guide](https://github.com/denoland/deno/blob/main/docs/contributing/style_guide.md).

### Document and maintain browser compatibility.

### Do not use the filename `index.ts`

### Minimize dependencies (target zero)

### Do not depend on external code.

### Use underscores, not dashes in filenames.

Example: Use `jellyfish_core.ts` instead of `jellyfish-core.ts`.

### Exported functions: max 2 args, put the rest into an options object.

When designing function interfaces, stick to the following rules.

1. A function that is part of the public API takes 0-2 required arguments, plus
   (if necessary) an options object (so max 3 total).

2. Optional parameters should generally go into the options object.

   An optional parameter that's not in an options object might be acceptable if there is only one, and it seems
   inconceivable that we would add more optional parameters in the future.

3. The 'options' argument is the only argument that is a regular 'Object'.

   Other arguments can be objects, but they must be distinguishable from a
   'plain' Object runtime, by having either:

- a distinguishing prototype (e.g. `Array`, `Map`, `Date`, `class MyThing`).
- a well-known symbol property (e.g. an iterable with `Symbol.iterator`).

This allows the API to evolve in a backwards compatible way, even when the position of the options object changes.

```ts
// BAD: optional parameters not part of options object. (#2)
export function resolve(
  hostname: string,
  family?: "ipv4" | "ipv6",
  timeout?: number,
): IPAddress[] {
}

// GOOD.
export interface ResolveOptions {
  family?: "ipv4" | "ipv6";
  timeout?: number;
}

export function resolve(
  hostname: string,
  options: ResolveOptions = {},
): IPAddress[] {
}
```

```ts
export interface Environment {
  [key: string]: string;
}

// BAD: `env` could be a regular Object and is therefore indistinguishable
// from an options object. (#3)
export function runShellWithEnv(cmdline: string, env: Environment): string {
}

// GOOD.
export interface RunShellOptions {
  env: Environment;
}

export function runShellWithEnv(
  cmdline: string,
  options: RunShellOptions,
): string {
}
```

```ts
// BAD: more than 3 arguments (#1), multiple optional parameters (#2).
export function renameSync(
  oldname: string,
  newname: string,
  replaceExisting?: boolean,
  followLinks?: boolean,
) {
}

// GOOD.
interface RenameOptions {
  replaceExisting?: boolean;
  followLinks?: boolean;
}

export function renameSync(
  oldname: string,
  newname: string,
  options: RenameOptions = {},
) {
}
```

```ts
// BAD: too many arguments. (#1)
export function pwrite(
  fd: number,
  buffer: TypedArray,
  offset: number,
  length: number,
  position: number,
) {
}

// BETTER.
export interface PWrite {
  fd: number;
  buffer: TypedArray;
  offset: number;
  length: number;
  position: number;
}

export function pwrite(options: PWrite) {
}
```

### Export all interfaces that are used as parameters to an exported member

Whenever you are using interfaces that are included in the arguments of an exported member, you should export the
interface that is used. Here is an example:

```ts
// my_file.ts
export interface Person {
  name: string;
  age: number;
}

export function createPerson(name: string, age: number): Person {
  return {name, age};
}

// mod.ts
export {createPerson} from "./my_file.ts";
export type {Person} from "./my_file.ts";
```

### If a filename starts with an underscore: `_foo.ts`, do not link to it.

### Use JSDoc for exported symbols.

We strive for complete documentation. Every exported symbol ideally should have a documentation line.

If possible, use a single line for the JSDoc. Example:

```ts
/** foo does bar. */
export function foo() {
  // ...
}
```

It is important that documentation is easily human-readable, but there is also a need to provide additional styling
information to ensure the generated documentation is more rich text. Therefore, JSDoc should generally follow markdown
markup to enrich the text.

While markdown supports HTML tags, it is forbidden in JSDoc blocks.

Code string literals should be braced with the back-tick (\`) instead of quotes. For example:

```ts
/** Import something from the `deno` module. */
```

Do not document function arguments unless they are non-obvious of their intent
(though if they are non-obvious intent, the API should be considered anyways). Therefore `@param` should generally not
be used. If `@param` is used, it should not include the `type` as TypeScript is already strongly typed.

```ts
/**
 * Function with non obvious param.
 * @param foo Description of non obvious parameter.
 */
```

Vertical spacing should be minimized whenever possible. Therefore, single line comments should be written as:

```ts
/** This is a good single line JSDoc. */
```

And not:

```ts
/**
 * This is a bad single line JSDoc.
 */
```

Code examples should not utilise the triple-back tick (\`\`\`) notation or tags. They should just be marked by
indentation, which requires a break before the block and 6 additional spaces for each line of the example. This is 4
more than the first column of the comment. For example:

```ts
/** A straight forward comment and an example:
 *
 *       import { foo } from "deno";
 *       foo("bar");
 */
```

Code examples should not contain additional comments. It is already inside a comment. If it needs further comments it is
not a good example.

### Top level functions should not use arrow syntax.

Top level functions should use the `function` keyword. Arrow syntax should be limited to closures.

Bad:

```ts
export const foo = (): string => {
  return "bar";
};
```

Good:

```ts
export function foo(): string {
  return "bar";
}
```
