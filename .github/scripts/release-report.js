/**
 * Release Report
 *
 * Generate a release message in PRs reporting the success of a new build
 * along with some quality of life links.
 */
module.exports = ({ context }) => {
  const links = getContainerLinks(context)
  return `

Docker build preview for jellyfish/apps is ready!
          
Built with commit ${context.sha}

 - ${links.join('\n - ')}
`
}

function getContainerLinks ({ payload: { number } }) {
  const apps = process.env.APPS.split(',')
  return apps.map(app => `ghcr.io/defich/${app}:pr-${number}`)
}
