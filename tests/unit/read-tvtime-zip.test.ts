import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { extractGdprCsvFiles } from '../../server/services/import/readTvTimeZip'

describe('extractGdprCsvFiles', () => {
  it('mappe les 4 CSV par nom, gère les chemins imbriqués et ignore le reste', () => {
    const zip = zipSync({
      'export/tracking-prod-records-v2.csv': strToU8('contenu-v2'),
      'export/tracking-prod-records.csv': strToU8('contenu-v1'),
      'followed_tv_show.csv': strToU8('contenu-followed'),
      'nested/dir/user_tv_show_data.csv': strToU8('contenu-user'),
      'export/ip_address.csv': strToU8('donnée-ignorée'),
    })

    expect(extractGdprCsvFiles(zip)).toEqual({
      trackingV2: 'contenu-v2',
      trackingV1: 'contenu-v1',
      followedShows: 'contenu-followed',
      userShowData: 'contenu-user',
    })
  })

  it('laisse vides les fichiers absents de l’archive', () => {
    const zip = zipSync({ 'tracking-prod-records.csv': strToU8('seulement-v1') })

    expect(extractGdprCsvFiles(zip)).toEqual({
      trackingV2: '',
      trackingV1: 'seulement-v1',
      followedShows: '',
      userShowData: '',
    })
  })
})
