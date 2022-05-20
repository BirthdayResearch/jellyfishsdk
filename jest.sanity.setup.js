const Dockerode = require('dockerode')
const path = require('path')
const { pack } = require('tar-fs')

const apps = ['whale']

module.exports = async function () {
  console.log('\nPreloading sanity images, this may take a while...')
  await Promise.all(apps.map(build))
}

/**
 * Builds a new image with a :sanity tag that can be pulled into unit tests and
 * run on the current state of the code base. These steps are required to
 * ensure that we are sanity testing against the current code state and not
 * pre-built solutions which is tested seperately during our standard unit
 * tests.
 *
 * @remarks Images are built with tar
 * @see     https://github.com/apocas/dockerode/issues/432
 */
async function build (app) {
  console.log(`Building '${app}:sanity' image`)
  const docker = new Dockerode()
  const image = pack(path.resolve(__dirname))
  const stream = await docker.buildImage(image, {
    t: `${app}:sanity`,
    buildargs: {
      APP: app
    }
  })
  await new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, res) => (err != null) ? reject(err) : resolve(res))
  })
  console.log(`Finished '${app}:sanity' image`)
}
