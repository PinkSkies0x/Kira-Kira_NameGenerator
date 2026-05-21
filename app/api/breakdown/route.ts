import Anthropic from '@anthropic-ai/sdk'
import { ratelimit, getIp } from '@/lib/ratelimit'

const client = new Anthropic()

// Survives warm serverless instances — avoids re-calling the API for the same name
const cache = new Map<string, object>()

const SYSTEM_PROMPT = `You are a master of Japanese onomastics. Break down a Japanese name character by character.

Rules: Only Jōyō (常用漢字) or Jinmeiyō (人名用漢字). Tag each "joyo" or "jinmei".

For each character provide: on-yomi, kun-yomi, thorough meaning in English (2-3 sentences) AND Japanese translation, integration_type ("phonetic" if reading echoes a syllable of the original name, else "semantic"), integration_note in English AND Japanese, usage_note in English AND Japanese, kanji_type.

Return ONLY valid JSON (no markdown):
{"characters":[{"kanji":"X","on_reading":"XX","kun_reading":"xx","meaning":"...","meaning_ja":"...","integration_type":"phonetic or semantic","integration_note":"...","integration_note_ja":"...","usage_note":"...","usage_note_ja":"...","kanji_type":"joyo or jinmei"}]}`

export async function POST(request: Request) {
  const { success } = await ratelimit.limit(getIp(request))
  if (!success) {
    return Response.json({ error: 'Too many requests — please wait a moment.' }, { status: 429 })
  }

  const { name, traits, selectedName } = await request.json()
  if (!name || !selectedName) {
    return Response.json({ error: 'name and selectedName are required' }, { status: 400 })
  }

  const cacheKey = `${name}|${traits ?? ''}|${selectedName.kanji}`
  if (cache.has(cacheKey)) {
    return Response.json(cache.get(cacheKey))
  }

  const userPrompt = `Original name: "${name}" | Traits: "${traits || 'from name'}"
Name to break down: ${selectedName.kanji} (${selectedName.reading})`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1400,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  cache.set(cacheKey, result)
  return Response.json(result)
}
