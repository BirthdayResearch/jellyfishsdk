/**
 * Release Tags
 *
 * Creating release tag based on each release version for AWS ECR Public
 *
 */

module.exports = ({ context }) => {
  if (context.eventName === 'release') {
    return getReleaseTag(context)
  }
  throw new Error('Release Violation: Could not determine the required release tags.')
}

function getReleaseTag(context) {
  const semver = require("semver");
  const version = context.payload.release.tag_name;
  if (!semver.valid(version)) {
    throw new Error(`Release Violation: Provided version '${semver}' is not valid semver.`)
  }
  return version.replace('v','')
}
