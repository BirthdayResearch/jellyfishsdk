import { ensureDir, move, remove, readdir } from 'fs-extra'
// import { createInterface } from 'readline'
// import { join, parse } from 'path'
// import { exec } from 'child_process'

const PACKAGE_DIR = './packages'
const PACKAGE_TYPEDOCS_KEY = 'typedocs'
const DOC_DIR = './docs/packages'

async function main (): Promise<void> {
  // Remove packages folder from docs
  try {
    await remove(`${DOC_DIR}`)
  } catch (err) {
    console.error(`Failed to clean ${DOC_DIR}`)
  }

  // Create directory from docs
  try {
    await ensureDir(`${DOC_DIR}`)
  } catch (err) {
    console.error(`Failed to create ${DOC_DIR}`)
  }

  // Get docs from all the packages
  const packagesFolder = await readdir(PACKAGE_DIR)
  for (const docsFolder of packagesFolder) {
    try {
      await move(`${PACKAGE_DIR}/${docsFolder}/${PACKAGE_TYPEDOCS_KEY}`, `${DOC_DIR}/${docsFolder}`, { overwrite: true })
    } catch (err) {
      console.log(`No typedocs, ignoring ${docsFolder}`)
    }
  }
  // for (const docFile of docFiles) {
  //   try {
  //     const { name: id, ext } = parse(docFile);
  //     if (ext !== ".md") {
  //       continue;
  //     }

  //     const docPath = join(dir, docFile);
  //     const input = createReadStream(docPath);
  //     const output = [];
  //     const lines = createInterface({
  //       input,
  //       crlfDelay: Infinity
  //     });

  //     let title = "";
  //     lines.on("line", line => {
  //       let skip = false;
  //       if (!title) {
  //         const titleLine = line.match(/## (.*)/);
  //         if (titleLine) {
  //           title = titleLine[1];
  //         }
  //       }
  //       const homeLink = line.match(/\[Home\]\(.\/index\.md\) &gt; (.*)/);
  //       if (homeLink) {
  //         // Skip the breadcrumb for the toplevel index file.
  //         if (id !== "faastjs") {
  //           output.push(homeLink[1]);
  //         }
  //         skip = true;
  //       }
  //       // See issue #4. api-documenter expects \| to escape table
  //       // column delimiters, but docusaurus uses a markdown processor
  //       // that doesn't support this. Replace with an escape sequence
  //       // that renders |.
  //       if (line.startsWith("|")) {
  //         line = line.replace(/\\\|/g, "&#124;");
  //       }
  //       if (!skip) {
  //         output.push(line);
  //       }
  //     });

  //     await new Promise(resolve => lines.once("close", resolve));
  //     input.close();

  //     const header = [
  //       "---",
  //       `id: ${id}`,
  //       `title: ${title}`,
  //       `hide_title: true`,
  //       "---"
  //     ];

  //     await writeFile(docPath, header.concat(output).join("\n"));
  //   } catch (err) {
  //     console.error(`Could not process ${docFile}: ${err}`);
  //   }
  // }
}

void main()
