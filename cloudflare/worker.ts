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
      const pathname = url.pathname.replace(/^\/+/, ''); // Remove leading slashes
      const parts = pathname.split('/').filter(Boolean);

      switch (request.method) {
        case 'GET':
          // List all tasks by getting all KV keys and their values
          const { keys } = await env.TASKS_KV.list();
          const allTasks = await Promise.all(
            keys.map(async (key) => {
              const value = await env.TASKS_KV.get(key.name);
              return value ? JSON.parse(value) : null;
            })
          );
          
          return new Response(JSON.stringify(allTasks.filter(Boolean)), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

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

          // Fetch previews for any new links
          if (newTask.links) {
            const previews = await Promise.all(
              newTask.links.map(async (link) => {
                if (!link.preview) {
                  const preview = await fetchLinkPreview(link.url);
                  return { ...link, preview };
                }
                return link;
              })
            );
            newTask.links = previews;
          }

          // Store task with its text as the key
          await env.TASKS_KV.put(
            newTask.id,
            JSON.stringify(newTask)
          );

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

          await env.TASKS_KV.put(taskId, JSON.stringify(updatedTask));

          return new Response(JSON.stringify(updatedTask), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        case 'DELETE':
          const deleteId = url.pathname.split('/').pop();
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
