import { getEmission } from '@src/module.api/stats.controller'

it('should have emission at 1250240', () => {
  const emission = getEmission(894000, 1250240)

  expect(emission).toStrictEqual({
    anchor: 0.06853592, // 0.06
    burned: 124.35843452646519, // 124.35
    community: 16.8255694, // 16.82
    dex: 87.21196359, // 87.21
    masternode: 114.21511773, // 114.21
    total: 342.6796211664652
  })
})
