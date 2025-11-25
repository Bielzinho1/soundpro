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

    console.log('Buscando no YouTube:', query);

    // Simula busca do YouTube retornando ID gerado a partir do query
    // Em produção, você usaria a YouTube Data API v3
    const videoId = encodeURIComponent(query).substring(0, 11);
    
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