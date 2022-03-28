import levelup from 'levelup'
import memdown from 'memdown'
import { LevelUpDatabase } from '../provider.level/LevelDatabase'

/**
 * MemoryDatabase uses [Level/memdown](https://github.com/Level/memdown)
 * This is a non persistent store created specifically for testing.
 */
export class MemoryDatabase extends LevelUpDatabase {
  constructor () {
    super(levelup(memdown()))
  }
}
