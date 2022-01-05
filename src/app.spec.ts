import { IApp } from './app'
import { container } from './dependency-injection/container'
import { TYPES } from './dependency-injection/types'

const SUT = container.get<IApp>(TYPES.IApp)

test('App should exist', () => {
  expect(SUT).toBeDefined()
  expect(SUT.timeKeeper).toBeDefined()
  expect(SUT.cli).toBeDefined()
  expect(SUT.db).toBeDefined()
  expect(SUT.timeFormatter).toBeDefined()
})
