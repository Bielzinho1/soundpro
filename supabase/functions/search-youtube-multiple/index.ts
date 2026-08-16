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
    .replace(/\[[^\]]*(official|video|audio|lyrics?|visualizer|remaster(ed)?|hd|4k)[^\]]*\]/gi, '')
    .replace(/\([^\)]*(official|video|audio|lyrics?|visualizer|remaster(ed)?|hd|4k)[^\)]*\)/gi, '')
    .replace(/\s+-\s+(official.*|audio.*|video.*|lyrics?.*)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const cleanupArtist = (artist = '') =>
  artist
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*vevo$/i, '')
    .replace(/\s*official$/i, '')
    .trim();

// Ranking suave: nunca remove resultados, apenas ordena por qualidade de áudio provável
const scoreResult = (item: any, normalizedQuery: string) => {
  const rawTitle = item?.snippet?.title || '';
  const title = normalizeText(rawTitle);
  const channel = normalizeText(item?.snippet?.channelTitle || '');
  const queryTerms = normalizedQuery.split(' ').filter(Boolean);

  let score = 0;

  const matchedTerms = queryTerms.filter((term) => title.includes(term) || channel.includes(term)).length;
  score += matchedTerms * 3;
  if (queryTerms.length > 0 && matchedTerms === queryTerms.length) score += 6;

  // Canais "- Topic" e VEVO entregam o master de estúdio (melhor qualidade de som)
  if (/-\s*topic$/i.test(item?.snippet?.channelTitle || '')) score += 10;
  if (/vevo/i.test(item?.snippet?.channelTitle || '')) score += 6;
  if (title.includes('official audio')) score += 5;
  if (title.includes('official video') || title.includes('official music video')) score += 3;
  if (title.includes('audio')) score += 2;
  if (title.includes('lyrics')) score += 1;

  // Penalidades leves: continuam na lista, só descem no ranking
  const weakSignals = ['live', 'ao vivo', 'karaoke', 'cover', 'reaction', 'slowed', 'reverb', 'nightcore', 'sped up', 'instrumental', 'tutorial', 'mashup'];
  if (weakSignals.some((signal) => title.includes(signal))) score -= 3;

  return score;
};

const mapItems = (items: any[], normalizedQuery: string, limit: number) => {
  const seen = new Set<string>();
  return [...items]
    .sort((a, b) => scoreResult(b, normalizedQuery) - scoreResult(a, normalizedQuery))
    .filter((item) => {
      const id = item?.id?.videoId;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, limit)
    .map((item: any) => ({
      title: cleanupTitle(item.snippet.title) || item.snippet.title,
      artist: cleanupArtist(item.snippet.channelTitle) || item.snippet.channelTitle,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    }));
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 10 } = await req.json();
    const safeQuery = typeof query === 'string' ? query.trim() : '';
    const parsedMaxResults = Math.min(Math.max(Number(maxResults) || 10, 1), 25);

    if (!safeQuery) {
      throw new Error('Query de busca é obrigatória');
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY não configurada');
    }

    console.log('Buscando no YouTube:', safeQuery);

    const candidateCount = Math.min(Math.max(parsedMaxResults * 2, 15), 40);
    const normalizedQuery = normalizeText(safeQuery);

    const runSearch = async (params: string) => {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${candidateCount}&q=${encodeURIComponent(safeQuery)}&key=${YOUTUBE_API_KEY}${params}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Erro YouTube:', response.status, await response.text());
        return [];
      }
      const data = await response.json();
      return Array.isArray(data.items) ? data.items : [];
    };

    // 1ª busca: categoria música (mais precisa). 2ª: busca aberta, para achar QUALQUER música.
    let items = await runSearch('&videoCategoryId=10');
    if (items.length < parsedMaxResults) {
      const extra = await runSearch('');
      items = [...items, ...extra];
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = mapItems(items, normalizedQuery, parsedMaxResults);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro na busca:', error);
    const message = error instanceof Error ? error.message : 'Erro na busca';
    return new Response(
      JSON.stringify({ error: message, results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
