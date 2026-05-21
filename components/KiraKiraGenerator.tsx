'use client'

import { useState, useRef, useCallback } from 'react'

interface KiraName {
  kanji: string
  reading: string
  reading_hiragana: string
  combined_meaning: string
  combined_meaning_ja: string
}

interface KiraCharacter {
  kanji: string
  on_reading: string
  kun_reading: string
  meaning: string
  meaning_ja: string
  integration_type: 'phonetic' | 'semantic'
  integration_note: string
  integration_note_ja: string
  usage_note: string
  usage_note_ja: string
  kanji_type: 'joyo' | 'jinmei'
}

const ui = {
  en: {
    toggleLabel: '日本語に翻訳',
    lblName: 'Your Name (English)',
    hintName: 'Used phonetically to inspire the sound and rhythm of your Japanese name',
    lblTraits: 'Descriptive Words or Qualities',
    hintTraits: 'Comma-separated words — synonyms and related concepts will also be explored',
    btnText: 'Generate Sparkling Names',
    namesLabel: '— Five Names Bestowed Upon You —',
    bdLabel: 'Individual Character Analysis',
    phonetic: 'Phonetic connection',
    semantic: 'Semantic connection',
    footNote: '♪ = phonetic echo of your name · ◈ = semantic match via thesaurus expansion',
    readingStrokes: 'Reading the strokes of',
    on: 'On',
    kun: 'Kun',
    joyo: '常用漢字 Jōyō ◆',
    jinmei: '人名用漢字 Jinmeiyō ✦',
    bdDivider: '✦  Character Breakdown  ✦',
    generating: 'Summoning Names',
    errBase: 'The spirits were silent. Please try again.',
  },
  ja: {
    toggleLabel: 'English translation',
    lblName: 'あなたの名前（英語）',
    hintName: '日本語名の音とリズムを導くために音声的に使用されます',
    lblTraits: 'あなたを表す言葉・特質',
    hintTraits: 'カンマ区切りの言葉 — 類義語や関連概念も探索されます',
    btnText: '輝く名前を生成する',
    namesLabel: '— 五つの名前があなたに授けられました —',
    bdLabel: '各文字の詳細分析',
    phonetic: '音声的なつながり',
    semantic: '意味的なつながり',
    footNote: '♪ = お名前の音の響き · ◈ = 類語展開による意味的一致',
    readingStrokes: '筆跡を読み解いています',
    on: '音読み',
    kun: '訓読み',
    joyo: '常用漢字 ◆',
    jinmei: '人名用漢字 ✦',
    bdDivider: '✦  各文字の解説  ✦',
    generating: '名前を召喚しています',
    errBase: '精霊たちは沈黙しました。もう一度お試しください。',
  },
}

const SpeakIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
)

const StopIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
)

const LoadingDots = () => (
  <span className="loading-dots">
    <span /><span /><span />
  </span>
)

export default function KiraKiraGenerator() {
  const [inputName, setInputName] = useState('')
  const [inputTraits, setInputTraits] = useState('')
  const [isJapanese, setIsJapanese] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [names, setNames] = useState<KiraName[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loadingBreakdownFor, setLoadingBreakdownFor] = useState(-1)
  const [breakdownCache, setBreakdownCache] = useState<Record<number, KiraCharacter[]>>({})
  const [speakingIndex, setSpeakingIndex] = useState(-1)
  const [error, setError] = useState('')
  const [breakdownError, setBreakdownError] = useState('')

  const submittedName = useRef('')
  const submittedTraits = useRef('')
  const breakdownRef = useRef<HTMLDivElement>(null)

  const t = (k: keyof typeof ui.en) => (isJapanese ? ui.ja : ui.en)[k]

  const generateNames = async () => {
    if (!inputName.trim()) {
      setError(isJapanese ? '名前を入力してください。' : 'Please enter your name to begin.')
      return
    }
    window.speechSynthesis?.cancel()
    setSpeakingIndex(-1)
    setError('')
    setNames([])
    setActiveIndex(-1)
    setBreakdownCache({})
    setBreakdownError('')
    submittedName.current = inputName.trim()
    submittedTraits.current = inputTraits.trim()
    setIsGenerating(true)
    try {
      const res = await fetch('/api/names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: submittedName.current, traits: submittedTraits.current }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setNames(data.names)
    } catch (e) {
      setError(`${t('errBase')} (${(e as Error).message})`)
    } finally {
      setIsGenerating(false)
    }
  }

  const showBreakdown = useCallback(
    async (index: number) => {
      if (index === activeIndex) {
        setActiveIndex(-1)
        setBreakdownError('')
        return
      }
      setActiveIndex(index)
      setBreakdownError('')
      if (breakdownCache[index]) return

      setLoadingBreakdownFor(index)
      try {
        const res = await fetch('/api/breakdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: submittedName.current,
            traits: submittedTraits.current,
            selectedName: names[index],
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setBreakdownCache((prev) => ({ ...prev, [index]: data.characters }))
        setTimeout(() => breakdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      } catch (e) {
        setBreakdownError(`${t('errBase')} (${(e as Error).message})`)
      } finally {
        setLoadingBreakdownFor(-1)
      }
    },
    [activeIndex, breakdownCache, names, t]
  )

  const speakName = (index: number, hiragana: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.speechSynthesis.cancel()
    if (speakingIndex === index) {
      setSpeakingIndex(-1)
      return
    }
    setSpeakingIndex(index)
    const u = new SpeechSynthesisUtterance(hiragana)
    u.lang = 'ja-JP'
    u.rate = 0.85
    u.pitch = 1.05
    const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith('ja'))
    if (v) u.voice = v
    u.onend = () => setSpeakingIndex(-1)
    u.onerror = () => setSpeakingIndex(-1)
    window.speechSynthesis.speak(u)
  }

  const activeChars = activeIndex >= 0 ? breakdownCache[activeIndex] : undefined
  const isLoadingBreakdown = loadingBreakdownFor >= 0

  return (
    <div className="wrap">
      <header className="hdr">
        <div className="hdr-kanji">輝く名前</div>
        <div className="ornament">✦ ✦ ✦</div>
        <h1 className="hdr-title">Kira-Kira Name Generator</h1>
        <p className="hdr-sub">Sparkling Japanese Formal Name Creator</p>
      </header>

      <div className="lang-toggle-row">
        <span className="lang-label">{t('toggleLabel')}</span>
        <div className="toggle-wrap">
          <div
            className={`toggle-track${isJapanese ? ' on' : ''}`}
            onClick={() => setIsJapanese((v) => !v)}
          >
            <div className="toggle-thumb" />
          </div>
          <span className="toggle-ja">日本語</span>
        </div>
      </div>

      <div className="form-card">
        <div className="field">
          <label>{t('lblName')}</label>
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateNames()}
            placeholder="e.g. Aurora, Elias, Mia..."
          />
          <div className="hint">{t('hintName')}</div>
        </div>
        <div className="field">
          <label>{t('lblTraits')}</label>
          <input
            type="text"
            value={inputTraits}
            onChange={(e) => setInputTraits(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateNames()}
            placeholder="e.g. gentle, ocean, dawn, brave, starlight..."
          />
          <div className="hint">{t('hintTraits')}</div>
        </div>
        <button className="gen-btn" onClick={generateNames} disabled={isGenerating}>
          ✦&nbsp;
          <span>
            {isGenerating ? (
              <>{t('generating')}<LoadingDots /></>
            ) : (
              t('btnText')
            )}
          </span>
          &nbsp;✦
        </button>
      </div>

      {error && <div className="err">{error}</div>}

      {names.length > 0 && (
        <div className="names-section">
          <div className="names-label">{t('namesLabel')}</div>
          <div className="names-grid">
            {names.map((n, i) => {
              const meaning = isJapanese && n.combined_meaning_ja ? n.combined_meaning_ja : n.combined_meaning
              const isActive = activeIndex === i
              return (
                <button
                  key={i}
                  className={`name-btn${isActive ? ' active' : ''}`}
                  onClick={() => showBreakdown(i)}
                  disabled={isLoadingBreakdown}
                >
                  <div className="name-kanji">{n.kanji}</div>
                  <div className="name-info">
                    <div className="name-reading">{n.reading} · {n.reading_hiragana}</div>
                    <div className="name-meaning">{meaning}</div>
                  </div>
                  <div className="name-actions">
                    <button
                      className={`speak-btn${speakingIndex === i ? ' speaking' : ''}`}
                      title={isJapanese ? '発音を聞く' : 'Hear pronunciation'}
                      onClick={(e) => speakName(i, n.reading_hiragana, e)}
                    >
                      {speakingIndex === i ? <StopIcon /> : <SpeakIcon />}
                    </button>
                    <div className="name-arrow">›</div>
                  </div>
                </button>
              )
            })}
          </div>

          <div ref={breakdownRef}>
            {activeIndex >= 0 && (
              <>
                <div className="divider">{t('bdDivider')}</div>
                {isLoadingBreakdown && loadingBreakdownFor === activeIndex ? (
                  <div className="bd-loading">
                    {t('readingStrokes')} {names[activeIndex].kanji}
                    <LoadingDots />
                  </div>
                ) : breakdownError ? (
                  <div className="err" style={{ marginTop: '1rem' }}>{breakdownError}</div>
                ) : activeChars ? (
                  <div className="fade-in">
                    <div className="bd-header">
                      <div className="bd-kanji">{names[activeIndex].kanji}</div>
                      <div className="bd-info">
                        <div className="bd-reading">{names[activeIndex].reading}</div>
                        <div className="bd-reading-sub">{names[activeIndex].reading_hiragana}</div>
                        <div className="bd-label">{t('bdLabel')}</div>
                      </div>
                    </div>
                    <div className="chars-list">
                      {activeChars.map((c, ci) => {
                        const icon = c.integration_type === 'phonetic' ? '♪' : '◈'
                        const label = c.integration_type === 'phonetic' ? t('phonetic') : t('semantic')
                        const meaning = isJapanese && c.meaning_ja ? c.meaning_ja : c.meaning
                        const intNote = isJapanese && c.integration_note_ja ? c.integration_note_ja : c.integration_note
                        const usageNote = isJapanese && c.usage_note_ja ? c.usage_note_ja : c.usage_note
                        return (
                          <div key={ci} className="char-card">
                            <div className="char-glyph">{c.kanji}</div>
                            <div>
                              <div className="char-reads">
                                <span className="char-on">{t('on')}: {c.on_reading}</span>
                                <span className="char-sep">|</span>
                                <span className="char-kun">{t('kun')}: {c.kun_reading}</span>
                              </div>
                              <div className="char-meaning">{meaning}</div>
                              <div className="char-conn">{icon} {label}: {intNote}</div>
                              <div className="char-usage">&ldquo;{usageNote}&rdquo;</div>
                              <div className="char-tags">
                                {c.kanji_type === 'joyo' ? (
                                  <span className="tag tag-joyo">{t('joyo')}</span>
                                ) : (
                                  <span className="tag tag-jinmei">{t('jinmei')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="foot-note">{t('footNote')}</div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
