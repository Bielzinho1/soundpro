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
    const { title, artist } = await req.json();

    if (!title || !artist) {
      throw new Error('Título e artista são obrigatórios');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Buscando letra:', title, '-', artist);

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
            content: `You are a lyrics database. Return the COMPLETE lyrics of the requested song in the original language. 
            Return ONLY a JSON object with:
            - lyrics: the full song lyrics as a string with line breaks (\\n)
            - language: the language of the song (e.g. "pt", "en", "es")
            
            If you don't know the exact lyrics, return your best approximation.
            Return ONLY the JSON object, nothing else.`
          },
          {
            role: 'user',
            content: `Song: "${title}" by ${artist}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da IA:', response.status, errorText);
      throw new Error(`Erro ao buscar letra: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const lyricsData = JSON.parse(content);

    return new Response(
      JSON.stringify(lyricsData),
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
