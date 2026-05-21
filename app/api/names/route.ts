import Anthropic from '@anthropic-ai/sdk'
import { ratelimit, getIp } from '@/lib/ratelimit'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a master of Japanese onomastics. Generate 5 kira-kira (キラキラ) Japanese given names.

STRICT RULES:
- ONLY Jōyō Kanji (常用漢字, 2136) or Jinmeiyō Kanji (人名用漢字, 863)
- Exactly 2 kanji per name, no family name. Musical, poetic readings.

Consider synonyms, nature/elemental symbols, poetic concepts, phonetic echoes of the name in Japanese syllables. Spread across: celestial, nature, emotional, phonetically close, creative blend. No repeated kanji.

Return ONLY valid JSON (no markdown):
{"names":[{"kanji":"XX","reading":"Xxxxx","reading_hiragana":"xxxxx","combined_meaning":"one evocative sentence","combined_meaning_ja":"同じ内容を日本語で一文"}]}

Exactly 5 names.`

export async function POST(request: Request) {
  const { success } = await ratelimit.limit(getIp(request))
  if (!success) {
    return Response.json({ error: 'Too many requests — please wait a moment.' }, { status: 429 })
  }

  const { name, traits } = await request.json()
  if (!name) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      { role: 'user', content: `Name: "${name}" | Traits: "${traits || 'infer from name'}"` },
    ],
  })

  const raw = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  return Response.json(result)
}
