const fs = require('fs')
const path = require('path')

/*
  This is a temporary migration script which gets run on commit to ensure that
  path based imports are replaced with relative imports.

  This migration script exists so that we can easily move updates from the
  original whale repo which still has quite a few outstanding PRs being worked
  on.

  Once original whale no longer has outstanding PRs associated with it we can
  delete this migration script.

  (todo @kodemon)
 */

async function migrate (src, depth = 0) {
  await migrateDirectory(src, depth)
}

async function migrateDirectory (src, depth) {
  const dir = await fs.promises.opendir(src)
  for await (const dirent of dir) {
    if (dirent.isDirectory()) {
      await migrateDirectory(path.resolve(src, dirent.name), depth + 1)
    } else {
      const filePath = path.resolve(src, dirent.name)
      const file = await migrateImports(filePath, getRelativePathFromDepth(depth))
      fs.writeFileSync(filePath, file)
    }
  }
}

async function migrateImports (src, relativePath) {
  const file = fs.readFileSync(src, 'utf-8')
  const lines = file.split('\n')
  const refactored = []
  for (const line of lines) {
    refactored.push(
      line
        .replace(/'@(.*)\/dist\/(.*)'/, "'@$1'")
        .replace(/'@whale-api-client(.*)'/, "'@defichain/whale-api-client'")
        .replace('@src/', relativePath)
    )
  }
  return refactored.join('\n')
}

function getRelativePathFromDepth (depth) {
  if (depth === 0) {
    return './'
  }
  return new Array(depth).fill('../').reduce((path, val) => {
    return path + val
  }, '')
}

migrate(path.resolve(__dirname, 'src')).then(() => {
  process.exit(0)
})
