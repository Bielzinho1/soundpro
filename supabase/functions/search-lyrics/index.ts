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

const decodeEntities = (value = '') =>
  value
    .replace(/&#3[49];/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const cleanupTitle = (title = '') =>
  decodeEntities(title)
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^\)]*(official|video|audio|lyrics?|letra|visualizer|live|remaster(ed)?|hd|4k|mix|version|clipe)[^\)]*\)/gi, ' ')
    .replace(/\s*[-–|]\s*(official|audio|video|lyrics?|letra|clipe|hd|4k)[^-–|]*$/gi, ' ')
    .replace(/\s*\bfeat\.?\b.*$/gi, ' ')
    .replace(/\s*\bft\.?\b.*$/gi, ' ')
    .replace(/["“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cleanupArtist = (artist = '') =>
  decodeEntities(artist)
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*vevo$/i, '')
    .replace(/\s*official(\s*channel)?$/i, '')
    .replace(/\s*music$/i, '')
    .replace(/\s+/g, ' ')
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
  if (resultTitle && (resultTitle.includes(normalizedTitle) || normalizedTitle.includes(resultTitle))) score += 4;
  if (resultArtist && normalizedArtist && (resultArtist.includes(normalizedArtist) || normalizedArtist.includes(resultArtist))) score += 4;
  if (typeof result?.plainLyrics === 'string' && result.plainLyrics.trim()) score += 2;
  return score;
};

const pickLyrics = (results: any[], title: string, artist: string) => {
  if (!Array.isArray(results) || results.length === 0) return null;
  const best = [...results].sort((a, b) => scoreLyricsMatch(b, title, artist) - scoreLyricsMatch(a, title, artist))[0];
  if (!best) return null;
  const plain = typeof best.plainLyrics === 'string' ? best.plainLyrics.trim() : '';
  const synced = typeof best.syncedLyrics === 'string' ? stripTimecodes(best.syncedLyrics) : '';
  return plain || synced || null;
};

const fetchJson = async (url: string) => {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'SoundPro/1.0 (https://soundpro.lovable.app)' } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const lrcLibByFields = async (title: string, artist: string) => {
  const params = new URLSearchParams({ track_name: title });
  if (artist) params.set('artist_name', artist);
  const data = await fetchJson(`https://lrclib.net/api/search?${params.toString()}`);
  return pickLyrics(data, title, artist);
};

const lrcLibLoose = async (title: string, artist: string) => {
  const data = await fetchJson(`https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${title}`.trim())}`);
  return pickLyrics(data, title, artist);
};

const lyricsOvh = async (title: string, artist: string) => {
  if (!artist || !title) return null;
  const data = await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
  return typeof data?.lyrics === 'string' && data.lyrics.trim() ? data.lyrics.trim() : null;
};

/**
 * O YouTube devolve títulos como "Bon Jovi - Bed Of Roses" com o canal "BonJovi",
 * ou "Bohemian Rhapsody" com canal "Queen". Geramos várias combinações
 * título/artista e tentamos todas até achar a letra certa.
 */
const buildCandidates = (rawTitle: string, rawArtist: string) => {
  const title = cleanupTitle(rawTitle);
  const artist = cleanupArtist(rawArtist);
  const candidates: Array<{ title: string; artist: string }> = [];

  const push = (t: string, a: string) => {
    const cleanT = t.trim();
    const cleanA = a.trim();
    if (!cleanT) return;
    if (candidates.some((c) => normalizeText(c.title) === normalizeText(cleanT) && normalizeText(c.artist) === normalizeText(cleanA))) return;
    candidates.push({ title: cleanT, artist: cleanA });
  };

  const parts = title.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const [first, ...rest] = parts;
    const last = rest.join(' - ');
    // "Artista - Música"
    push(last, first);
    // "Música - Artista"
    push(first, last);
    push(last, artist);
    push(first, artist);
    push(last, '');
    push(first, '');
  }

  push(title, artist);
  push(title, '');

  return candidates.slice(0, 8);
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
    const rawTitle = typeof title === 'string' ? title : '';
    const rawArtist = typeof artist === 'string' ? artist : '';

    if (!rawTitle.trim()) throw new Error('Título é obrigatório');

    const candidates = buildCandidates(rawTitle, rawArtist);
    console.log('Buscando letra para candidatos:', JSON.stringify(candidates));

    let lyrics: string | null =
      typeof providedLyrics === 'string' && providedLyrics.trim() ? providedLyrics.trim() : null;
    let matched = candidates[0] ?? { title: rawTitle, artist: rawArtist };

    if (!lyrics) {
      for (const candidate of candidates) {
        const found =
          (await lrcLibByFields(candidate.title, candidate.artist)) ??
          (await lrcLibLoose(candidate.title, candidate.artist)) ??
          (await lyricsOvh(candidate.title, candidate.artist));

        if (found && found.length > 40) {
          lyrics = found;
          matched = candidate;
          break;
        }
      }
    }

    let translation: string | null = null;
    if (translate && lyrics) {
      translation = await translateLyrics(lyrics, matched.title, matched.artist);
    }

    return new Response(
      JSON.stringify({ lyrics, translation, title: matched.title, artist: matched.artist }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar letra:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar letra';
    return new Response(
      JSON.stringify({ error: errorMessage, lyrics: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
