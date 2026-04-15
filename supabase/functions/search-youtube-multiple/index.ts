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
    .replace(/\[[^\]]*(official|video|audio|lyrics?|visualizer|remaster(ed)?|hd|4k|live)[^\]]*\]/gi, '')
    .replace(/\([^\)]*(official|video|audio|lyrics?|visualizer|remaster(ed)?|hd|4k)[^\)]*\)/gi, '')
    .replace(/\s+-\s+(official.*|audio.*|video.*|lyrics?.*)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const cleanupArtist = (artist = '') =>
  artist
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*vevo$/i, '')
    .trim();

const buildSearchQuery = (query: string) => {
  const normalizedQuery = normalizeText(query);
  const alreadySpecific = /(official|audio|lyrics|live|acoustic|remix|karaoke)/.test(normalizedQuery);
  return alreadySpecific ? query : `${query} official audio`;
};

const scoreResult = (item: any, normalizedQuery: string) => {
  const title = normalizeText(item?.snippet?.title || '');
  const channel = normalizeText(item?.snippet?.channelTitle || '');
  const queryTerms = normalizedQuery.split(' ').filter(Boolean);

  let score = 0;

  const matchedTerms = queryTerms.filter((term) => title.includes(term) || channel.includes(term)).length;
  score += matchedTerms * 3;

  if (queryTerms.length > 0 && matchedTerms === queryTerms.length) score += 6;
  if (channel.includes('topic')) score += 5;
  if (title.includes('official audio')) score += 4;
  if (title.includes('lyrics')) score += 3;
  if (title.includes('visualizer')) score += 2;
  if (title.includes('official music video')) score += 1;

  const negativeSignals = ['live', 'karaoke', 'cover', 'reaction', 'slowed', 'reverb', 'nightcore', 'instrumental', 'tutorial', 'shorts', 'podcast'];
  if (negativeSignals.some((signal) => title.includes(signal) || channel.includes(signal))) score -= 8;

  return score;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 10 } = await req.json();
    const safeQuery = typeof query === 'string' ? query.trim() : '';
    const parsedMaxResults = Math.min(Math.max(Number(maxResults) || 10, 1), 20);

    if (!safeQuery) {
      throw new Error('Query de busca é obrigatória');
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY não configurada');
    }

    console.log('Buscando no YouTube:', safeQuery);

    const searchQuery = buildSearchQuery(safeQuery);
    const candidateCount = Math.min(Math.max(parsedMaxResults * 2, 10), 25);
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${candidateCount}&type=video&videoCategoryId=10&q=${encodeURIComponent(searchQuery)}&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro YouTube:', response.status, errorText);
      throw new Error(`Erro na API do YouTube: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedQuery = normalizeText(safeQuery);

    const results = [...data.items]
      .sort((a: any, b: any) => scoreResult(b, normalizedQuery) - scoreResult(a, normalizedQuery))
      .slice(0, parsedMaxResults)
      .map((item: any) => ({
      title: cleanupTitle(item.snippet.title) || item.snippet.title,
      artist: cleanupArtist(item.snippet.channelTitle) || item.snippet.channelTitle,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    }));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar vídeos';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
