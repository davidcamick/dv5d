export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      const url = new URL(request.url);

      if (request.method === 'GET') {
        // Retrieve encrypted passwords
        const data = await env.PASSWORD_STORE.get('encrypted_passwords');
        return new Response(data || '{}', {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      if (request.method === 'POST') {
        // Store encrypted passwords
        const encryptedData = await request.json();
        await env.PASSWORD_STORE.put('encrypted_passwords', JSON.stringify(encryptedData));
        
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Handle unsupported methods
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
