import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { loadSeriesEpisodes, loadXtream } from './xtream'
import type { Channel } from '../types'

const originalUrl = (input: RequestInfo | URL) => {
  const raw = String(input)
  const encoded = new URL(raw).pathname.split('/').pop() || ''
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encoded.length % 4) % 4)
  return new TextDecoder().decode(Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)))
}

const nativeFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = nativeFetch })

describe('Xtream katalog yükleme', () => {
  it('bir uç nokta bozulduğunda çalışan kataloğu korur', async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = originalUrl(input)
      if (!url.includes('action=')) return Response.json({ user_info: { auth: 1 } })
      if (url.includes('get_live_streams')) return Response.json([{ stream_id: 7, name: 'Test TV' }])
      if (url.includes('get_live_categories')) throw new Error('kategori kapalı')
      if (url.includes('get_vod_streams') || url.includes('get_series')) throw new Error('uç nokta kapalı')
      return Response.json([])
    }

    const channels = await loadXtream({ name: 'Test', server: 'http://provider.test', username: 'u', password: 'p' })
    assert.equal(channels.length, 1)
    assert.deepEqual({ name: channels[0].name, category: channels[0].category, type: channels[0].type }, { name: 'Test TV', category: 'Diğer', type: 'live' })
  })

  it('sezonları ve bütün oynatılabilir bölümleri sıralar', async () => {
    globalThis.fetch = async () => Response.json({
      info: { cover: 'https://images.test/show.jpg', plot: 'Özet' },
      episodes: {
        2: [{ id: 22, episode_num: 2 }, { id: 21, episode_num: 1 }],
        1: [{ id: 11, episode_num: 1, title: 'Başlangıç' }],
      },
    })
    const series: Channel = {
      id: 'series-1', name: 'Dizi', url: '', category: 'Netflix', type: 'series',
      seriesInfoUrl: 'http://provider.test/info', seriesBaseUrl: 'http://provider.test/series/u/p',
    }

    const seasons = await loadSeriesEpisodes(series)
    assert.deepEqual(seasons.map((season) => season.number), ['1', '2'])
    assert.deepEqual(seasons[1].episodes.map((episode) => episode.episodeLabel), ['S02E01', 'S02E02'])
    assert.equal(seasons[0].episodes[0].parentId, 'series-1')
    assert.equal(seasons[0].episodes[0].url, 'http://provider.test/series/u/p/11.mp4')
  })
})
