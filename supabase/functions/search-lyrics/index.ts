import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cleanupTitle = (title = '') =>
  title
    .replace(/\[[^\]]*(official|video|audio|lyrics?|visualizer|live|remaster(ed)?|hd|4k)[^\]]*\]/gi, '')
    .replace(/\([^\)]*(official|video|audio|lyrics?|visualizer|live|remaster(ed)?|hd|4k)[^\)]*\)/gi, '')
    .replace(/\s+-\s+(official.*|audio.*|video.*|lyrics?.*)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const cleanupArtist = (artist = '') =>
  artist
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*vevo$/i, '')
    .trim();

const stripTimecodes = (lyrics = '') => lyrics.replace(/^\[[0-9:.]+\]\s*/gm, '').trim();

const scoreLyricsMatch = (result: any, title: string, artist: string) => {
  const resultTitle = normalizeText(result?.trackName || '');
  const resultArtist = normalizeText(result?.artistName || '');
  const normalizedTitle = normalizeText(title);
  const normalizedArtist = normalizeText(artist);

  let score = 0;

  if (resultTitle === normalizedTitle) score += 8;
  if (resultArtist === normalizedArtist) score += 8;
  if (resultTitle.includes(normalizedTitle) || normalizedTitle.includes(resultTitle)) score += 4;
  if (resultArtist.includes(normalizedArtist) || normalizedArtist.includes(resultArtist)) score += 4;

  return score;
};

const searchLrcLib = async (title: string, artist: string) => {
  const response = await fetch(
    `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
    { headers: { 'User-Agent': 'SoundPro/1.0' } }
  );

  if (!response.ok) return null;

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const bestMatch = [...results].sort((a, b) => scoreLyricsMatch(b, title, artist) - scoreLyricsMatch(a, title, artist))[0];
  const plainLyrics = typeof bestMatch?.plainLyrics === 'string' ? bestMatch.plainLyrics.trim() : '';
  const syncedLyrics = typeof bestMatch?.syncedLyrics === 'string' ? stripTimecodes(bestMatch.syncedLyrics) : '';

  return plainLyrics || syncedLyrics || null;
};

const searchLrcLibLoose = async (title: string, artist: string) => {
  const response = await fetch(
    `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${title}`)}`,
    { headers: { 'User-Agent': 'SoundPro/1.0' } }
  );

  if (!response.ok) return null;

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const bestMatch = [...results].sort((a, b) => scoreLyricsMatch(b, title, artist) - scoreLyricsMatch(a, title, artist))[0];
  const plainLyrics = typeof bestMatch?.plainLyrics === 'string' ? bestMatch.plainLyrics.trim() : '';
  const syncedLyrics = typeof bestMatch?.syncedLyrics === 'string' ? stripTimecodes(bestMatch.syncedLyrics) : '';

  return plainLyrics || syncedLyrics || null;
};

const searchLyricsOvh = async (title: string, artist: string) => {
  const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
  if (!response.ok) return null;

  const data = await response.json();
  return typeof data?.lyrics === 'string' && data.lyrics.trim() ? data.lyrics.trim() : null;
};

const translateLyrics = async (lyrics: string, title: string, artist: string) => {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content:
            'Você traduz letras de música para português do Brasil. Responda APENAS com a tradução, mantendo a mesma quebra de linhas e estrutura de versos do original. Não adicione comentários, títulos ou explicações. Se um verso já estiver em português, mantenha-o.',
        },
        {
          role: 'user',
          content: `Música: ${title} - ${artist}\n\nLetra:\n${lyrics.slice(0, 6000)}`,
        },
      ],
    }),
  });

  if (response.status === 429) throw new Error('Muitas traduções agora, tente em instantes');
  if (response.status === 402) throw new Error('Créditos de IA esgotados');
  if (!response.ok) throw new Error(`Erro na tradução: ${response.status}`);

  const data = await response.json();
  const translation = data?.choices?.[0]?.message?.content;
  return typeof translation === 'string' ? translation.trim() : null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { title, artist, translate, lyrics: providedLyrics } = body ?? {};
    const safeTitle = typeof title === 'string' ? cleanupTitle(title) : '';
    const safeArtist = typeof artist === 'string' ? cleanupArtist(artist) : '';

    if (!safeTitle || !safeArtist) {
      throw new Error('Título e artista são obrigatórios');
    }

    let lyrics: string | null =
      typeof providedLyrics === 'string' && providedLyrics.trim() ? providedLyrics.trim() : null;

    if (!lyrics) {
      lyrics = await searchLrcLib(safeTitle, safeArtist);
    }
    if (!lyrics) {
      lyrics = await searchLrcLibLoose(safeTitle, safeArtist);
    }
    if (!lyrics) {
      lyrics = await searchLyricsOvh(safeTitle, safeArtist);
    }

    let translation: string | null = null;
    if (translate && lyrics) {
      translation = await translateLyrics(lyrics, safeTitle, safeArtist);
    }

    return new Response(
      JSON.stringify({ lyrics, translation, title: safeTitle, artist: safeArtist }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar letra:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar letra';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
