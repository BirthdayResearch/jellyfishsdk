export default (): any => ({
  defid: {
    url: process.env.WHALE_DEFID_URL
  },
  network: process.env.WHALE_NETWORK,
  database: {
    provider: process.env.WHALE_DATABASE_PROVIDER
  }
})
