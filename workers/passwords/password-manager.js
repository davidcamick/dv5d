export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',  // Changed from 'https://dv5d.org' to '*'
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        headers: corsHeaders,
        status: 200  // Added explicit status
      });
    }

    try {
      if (request.method === 'GET') {
        const data = await env.PASSWORD_STORE.get('encrypted_passwords');
        return new Response(data || '{}', {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      if (request.method === 'POST') {
        const encryptedData = await request.json();
        await env.PASSWORD_STORE.put('encrypted_passwords', JSON.stringify(encryptedData));
        
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};
