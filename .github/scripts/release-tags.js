/**
 * Release Tags
 * 
 * Extracts tags which we can attach to our docker build processes for
 * container versioning. Looking at the context we determine what the
 * tag needs to look like in the scenarios of 'release', 'staging',
 * and 'dev'.
 *
 * 'release' - relates to full application release through the github
 *             release process. We grab the version from the label
 *             created for publishing.
 *
 * 'staging' - relates to the 'main' branch which serves as a staging
 *             step before a full release. The version is tagged with
 *             'main-${hash}'
 *
 * 'dev'     - relates to PRs which are submitted against the main 
 *             branch. The version is tagged with 'pr-${hash}'.
 *
 * This script is tied to actions/github-script jobs in our workflows.
 *
 * @see https://github.com/actions/github-script
 */

module.exports = ({ context }) => {
  const app = process.env.APP
  if (isRelease(context) === true) {
    return getReleaseTag(app, context)
  }
  if (isStaging(context) === true) {
    return getStagingTag(app, context)
  }
  if (isDev(context) === true) {
    return getDevTag(app, context)
  }
  throw new Error('Release Violation: Could not determine the required release tags.')
}

function isRelease(context) {
  return context.eventName === 'release'
}

function isStaging(context) {
  return context.eventName === 'push' && context.ref === 'refs/heads/main'
}

function isDev(context) {
  return context.eventName === 'pull_request_target' && context.ref === 'refs/heads/main'
}

function getReleaseTag(app, context) {
  const semver = context.payload.release.tag_name.replace('v', '')
  if (semver.match(/^[0-9]+\.[0-9]+\.[0-9]+$/) === false) {
    throw new Error(`Release Violation: Provided version '${semver}' is not valid semver.`)
  }
  return `ghcr.io/defich/${app}:latest,ghcr.io/defich/${app}:${semver}`
}

function getStagingTag(app, context) {
  return `ghcr.io/defich/${app}:main-${context.sha.substr(0, 12)}`
}

function getDevTag(app, context) {
  return `ghcr.io/defich/${app}:pr-${context.sha.substr(0, 12)}`
}
