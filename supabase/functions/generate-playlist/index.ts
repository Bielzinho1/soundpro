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
            content: `Você é um especialista em música que cria playlists personalizadas. 
            Baseado no prompt do usuário, você deve retornar um JSON com:
            - title: título criativo para a playlist
            - description: descrição curta da vibe
            - mood: uma palavra que descreve o mood (ex: Energia, Chill, Treino, Nostalgia)
            - tracks: array de 8-12 músicas, cada uma com:
              - title: nome da música
              - artist: nome do artista
              - searchQuery: query otimizada para buscar no YouTube (formato: "artista - música official audio")
            
            Retorne APENAS o JSON, sem markdown ou texto adicional.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
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
    
    let content = data.choices[0].message.content;
    console.log('Conteúdo bruto:', content);
    
    // Remove markdown code blocks de forma mais robusta
    content = content.trim();
    
    // Remove blocos ```json ou ``` do início e fim
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    
    // Remove qualquer backtick solto que possa ter sobrado
    content = content.replace(/^`+|`+$/g, '');
    
    // Trim final
    content = content.trim();
    
    console.log('Conteúdo limpo:', content);
    
    // Parse o JSON da resposta
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