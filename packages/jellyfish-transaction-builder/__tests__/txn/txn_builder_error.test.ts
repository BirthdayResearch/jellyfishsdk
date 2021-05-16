describe('FeeRateProvider', () => {
  it('should fail due to high fee: OVER_MAX_FEE_RATE', () => {

  })

  it('should fail due to invalid fee: INVALID_FEE_RATE', () => {

  })
})

describe('PrevoutProvider', () => {
  it('should fail due to empty prevout in PrevoutProvider.all(): NO_PREVOUTS', () => {

  })

  it('should fail due to empty prevout in PrevoutProvider.collect(): NO_PREVOUTS', () => {

  })

  it('should fail balance not enough in PrevoutProvider.collect(): MIN_BALANCE_NOT_ENOUGH', () => {

  })
})

describe('EllipticPairProvider', () => {
  it('should fail as provided EllipticPair cannot sign transaction: SIGN_TRANSACTION_ERROR', () => {

  })
})
