const HARDENED = 0x80000000

/**
 * Based on https://github.com/axic/bip32-path
 *
 * The MIT License (MIT)
 * Copyright (c) 2016 Alex Beregszaszi
 */
export class BIP32Path {
  private readonly path: number[];

  private constructor (path: number[]) {
    if (!Array.isArray(path)) {
      throw new Error('Input must be an Array')
    }
    if (path.length === 0) {
      throw new Error('Path must contain at least one level')
    }
    for (let i = 0; i < path.length; i++) {
      if (typeof path[i] !== 'number') {
        throw new Error('Path element is not a number')
      }
    }
    this.path = path
  }

  static fromPathArray (path: number[]) {
    return new BIP32Path(path)
  }

  /**
   * @param text to create BipPath from
   * @param reqRoot whether root 'm' is required
   *
   * @example of support text
   * 0/0/0
   * m/0/0
   * m/0'/0'
   * m/0'/0'/0
   */
  static fromString (text: string, reqRoot: boolean = false) {
    // skip the root
    if (/^m\//i.test(text)) {
      text = text.slice(2)
    } else if (reqRoot) {
      throw new Error('Root element is required')
    }

    const splits = text.split('/');
    const paths = new Array(splits.length);

    for (let i = 0; i < splits.length; i++) {
      const tmp = /(\d+)([hH']?)/.exec(splits[i]);
      if (tmp === null) {
        throw new Error('Invalid input')
      }

      paths[i] = parseInt(tmp[1], 10)

      if (paths[i] >= HARDENED) {
        throw new Error('Invalid child index')
      }

      if (tmp[2] === "'") {
        paths[i] += HARDENED
      } else if (tmp[2].length != 0) {
        throw new Error('Invalid modifier')
      }
    }
    return new BIP32Path(paths)
  }

  /**
   * @return as number[] array
   */
  toPathArray (): number[] {
    return this.path
  }

  /**
   * @param root whether to include root
   */
  toString (root: boolean = true) {
    const ret = new Array(this.path.length);
    for (let i = 0; i < this.path.length; i++) {
      const tmp = this.path[i];
      if (tmp & HARDENED) {
        ret[i] = (tmp & ~HARDENED) + "'"
      } else {
        ret[i] = tmp
      }
    }
    return (root ? 'm/' : '') + ret.join('/')
  }

  /**
   * Bip32 path as buffer.
   * @return [
   * length of derivations,
   * path0,
   * path1,
   * path2,
   * ...
   * ]
   */
  asBuffer (): Buffer {
    const paths = this.toPathArray();
    let buffer = Buffer.alloc(1 + paths.length * 4);
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    return buffer;
  }
}
