import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      throw new Error('Query de busca é obrigatória');
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY não configurada');
    }

    console.log('Buscando no YouTube:', query);

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&type=video&videoCategoryId=10&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao buscar no YouTube:', response.status, errorText);
      throw new Error(`Erro na API do YouTube: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Nenhum vídeo encontrado');
    }

    const videoId = data.items[0].id.videoId;
    console.log('Vídeo encontrado:', videoId);
    
    return new Response(
      JSON.stringify({ videoId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro ao buscar vídeo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar vídeo';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});