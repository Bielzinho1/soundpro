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
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error('Prompt é obrigatório');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Gerando playlist para prompt:', prompt);

    // Chama a IA para gerar uma playlist
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a music expert that creates personalized playlists. 
            Based on the user's prompt, return ONLY a valid JSON object (no markdown, no code blocks) with:
            - title: creative playlist title
            - description: short vibe description
            - mood: one word describing the mood (ex: Energy, Chill, Workout, Nostalgia)
            - tracks: array of 8-12 songs, each with:
              - title: song name
              - artist: artist name
              - searchQuery: optimized query for YouTube search (format: "artist - song official audio")
            
            Return ONLY the JSON object, nothing else.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da IA:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos da IA esgotados. Entre em contato com o suporte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro da IA: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta completa da IA:', JSON.stringify(data, null, 2));
    
    const content = data.choices[0].message.content;
    console.log('Conteúdo recebido:', content);
    
    // Parse direto - com response_format json_object não vem com markdown
    const playlistData = JSON.parse(content);
    console.log('Playlist gerada com sucesso:', JSON.stringify(playlistData, null, 2));

    return new Response(
      JSON.stringify(playlistData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro ao gerar playlist:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar playlist';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});