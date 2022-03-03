/**
 * Release Report
 * 
 * Generate a release message in PRs reporting the success of a new build
 * along with some quality of life links.
 * 
 */

const apps = process.env.APPS.split(",")

module.exports = ({ context }) => {
  const links = getContainerLinks(context)
  return `
  Build preview for jellyfish apps is ready!
            
  Built with commit ${ context.sha }

  ${links.join("\n")}
  `
}
 
function getContainerLinks({ payload: { number } }) {
  return apps.map(app => `https://ghcr.io/defich/${app}:pr-${number}`)
}
