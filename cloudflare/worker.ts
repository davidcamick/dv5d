import { fetchLinkPreview } from './link-preview';

interface Env {
  TASKS_KV: KVNamespace;
}

interface TaskList {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

interface Task {
  id: string;
  listId: string;
  text: string;
  completed: boolean;
  createdAt: number;
  dueDate?: number;        // ✅ Handles calendar dates
  tags: string[];          // ✅ Handles tags
  color?: string;          // ✅ Handles color coding
  links: {                 // ✅ Handles links with previews
    url: string;
    preview?: {
      title: string;
      description: string;
      image: string;
    }
  }[];
  priority: 'low' | 'medium' | 'high';  // ✅ Handles priority levels
  notes?: string;         // ✅ Handles additional notes
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://dv5d.org',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Email, If-Modified-Since',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204
      });
    }

    try {
      const url = new URL(request.url);
      const parts = url.pathname.split('/').filter(Boolean);

      switch (request.method) {
        case 'GET':
          // Cache the list request for 2 seconds to prevent hammering KV
          const cacheKey = 'tasks-list';
          const cachedData = await caches.default.match(request);
          
          if (cachedData) {
            return cachedData;
          }

          // Batch read all tasks
          const { keys } = await env.TASKS_KV.list();
          const promises = keys.map(key => env.TASKS_KV.get(key.name));
          const values = await Promise.all(promises);
          const tasks = values.map(value => value ? JSON.parse(value) : null).filter(Boolean);
          
          const response = new Response(JSON.stringify(tasks), {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=2',
            },
          });

          // Cache the response
          ctx.waitUntil(caches.default.put(request, response.clone()));
          
          return response;

        case 'POST':
          if (url.pathname.endsWith('/preview')) {
            const { url: previewUrl } = await request.json();
            const preview = await fetchLinkPreview(previewUrl);
            return new Response(JSON.stringify(preview), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const newTask: Task = await request.json();
          newTask.id = crypto.randomUUID();
          newTask.createdAt = Date.now();

          // Write directly without preview for speed
          await env.TASKS_KV.put(newTask.id, JSON.stringify(newTask));

          return new Response(JSON.stringify(newTask), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        case 'PUT':
          const taskId = parts[0];
          if (!taskId) {
            return new Response('Task ID required', { 
              status: 400, 
              headers: corsHeaders 
            });
          }

          const taskToUpdate: Task = await request.json();
          
          // Always use the ID from the URL path
          const updatedTask = {
            ...taskToUpdate,
            id: taskId
          };

          // Write directly without validation for speed
          await env.TASKS_KV.put(taskId, JSON.stringify(updatedTask));

          return new Response(JSON.stringify(updatedTask), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        case 'DELETE':
          const deleteId = parts[0];
          await env.TASKS_KV.delete(deleteId);
          
          return new Response(null, {
            status: 204,
            headers: corsHeaders,
          });

        default:
          return new Response('Method not allowed', { 
            status: 405, 
            headers: corsHeaders 
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', details: error.message }), 
        { 
          status: 500, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    }
  },
};
