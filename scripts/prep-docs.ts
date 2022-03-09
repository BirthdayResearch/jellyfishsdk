import { ensureDir, move, readdir, readFile, writeFile, remove, rename } from 'fs-extra'
import { parse } from 'path'

const PACKAGE_DIR = './packages'
const PACKAGE_TYPEDOCS_KEY = 'typedocs'
const DOC_DIR = './docs/packages'

async function removeBreadcrumbs (input: string): Promise<string> {
  return input.replace(/.*Exports.*\n+#/gim, '#')
}

/**
 * The generated closing tags doesn't work directly with docusaurus
 * which breaks if not escaped. This function escapes them.
 * @param input string
 * @returns processed string
 */
async function escapeClosingTag (input: string): Promise<string> {
  return input.replace(/<.*[^\\]>/gi, (match: string, ...args: any[]): string => {
    return match.replace(/>/gi, '\\>')
  })
}

/**
 * Corrects the modules.md link to point to readme link after renaming
 */
async function reRouteModulesMdToReadme (input: string): Promise<string> {
  return input.replace(/modules\.md/g, 'README.md')
}

async function main (): Promise<void> {
  // Create directory from docs
  try {
    await ensureDir(`${DOC_DIR}`)
  } catch (err) {
    console.error(`Failed to create ${DOC_DIR}`)
  }

  // Format all .md file into compatible format
  const packagesFolder = await readdir(PACKAGE_DIR)
  for (const docsFolder of packagesFolder) {
    const docsFolderFullPath = `${PACKAGE_DIR}/${docsFolder}/${PACKAGE_TYPEDOCS_KEY}`

    // Remove the written readme, and instead use the toc as readme
    // This would make the generated UI make more sense
    try {
      await remove(`${docsFolderFullPath}/README.md`)
      await rename(`${docsFolderFullPath}/modules.md`, `${docsFolderFullPath}/README.md`)
    } catch (err) {
      console.error(err)
    }

    const relevantPaths = [
      docsFolderFullPath,
      `${docsFolderFullPath}/classes`,
      `${docsFolderFullPath}/enums`,
      `${docsFolderFullPath}/interfaces`,
      `${docsFolderFullPath}/modules`
    ]

    try {
      // Traverse all the folders for md file to process
      const promises = relevantPaths.map(async (path) => {
        const docFiles = await readdir(path)
        for (const docFile of docFiles) {
          const { ext } = parse(docFile)
          if (ext !== '.md') {
            continue
          }

          const docPath = `${path}/${docFile}`
          const input = await readFile(docPath)

          // Do processing here
          let output = input.toString()
          output = await removeBreadcrumbs(output)
          output = await escapeClosingTag(output)
          output = await reRouteModulesMdToReadme(output)

          await writeFile(docPath, output)
        }
      })
      await Promise.all(promises)
    } catch (err) {
      // Do nothing if error since it might not have these folders
    }
  }

  // Move docs from all the packages to docs
  const formattedPackagesFolder = await readdir(PACKAGE_DIR)
  for (const docsFolder of formattedPackagesFolder) {
    try {
      await move(`${PACKAGE_DIR}/${docsFolder}/${PACKAGE_TYPEDOCS_KEY}`, `${DOC_DIR}/${docsFolder}`, { overwrite: true })
    } catch (err) {
      console.log(`No typedocs, ignoring ${docsFolder}`)
    }
  }
}

void main()
