/* eslint-disable @typescript-eslint/no-non-null-assertion, no-void */

/**
 * @param {() => Promise<boolean>} condition to wait for true
 * @param {number} timeout duration when condition is not met
 * @param {number} [interval=200] duration in ms
 */
export async function waitForCondition (condition: () => Promise<boolean>, timeout: number, interval: number = 200): Promise<void> {
  const expiredAt = Date.now() + timeout

  return await new Promise((resolve, reject) => {
    const checkCondition = async (): Promise<void> => {
      const isReady = await condition().catch(() => false)
      if (isReady) {
        resolve()
      } else if (expiredAt < Date.now()) {
        reject(new Error(`waitForCondition is not ready within given timeout of ${timeout}ms.`))
      } else {
        setTimeout(() => void checkCondition(), interval)
      }
    }

    void checkCondition()
  })
}
