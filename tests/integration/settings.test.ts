import { describe, expect, it } from 'vitest'
import { getAppSettings, updateAppSettings } from '../../server/services/settings/appSettings'
import { createTestDb } from '../helpers/testDb'

describe('settings service', () => {
  it('returns English as the default display language', () => {
    const db = createTestDb()

    expect(getAppSettings(db)).toEqual({ displayLanguage: 'en' })
  })

  it('persists the selected display language', () => {
    const db = createTestDb()

    expect(updateAppSettings(db, { displayLanguage: 'fr' })).toEqual({ displayLanguage: 'fr' })
    expect(getAppSettings(db)).toEqual({ displayLanguage: 'fr' })
  })
})
