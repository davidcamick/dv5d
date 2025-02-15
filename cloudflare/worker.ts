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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Email',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204
      });
    }

    const userEmail = request.headers.get('X-User-Email');
    if (!userEmail) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    try {
      switch (request.method) {
        case 'GET':
          if (url.pathname.endsWith('/lists')) {
            const lists = await env.TASKS_KV.get(`lists:${userEmail}`);
            return new Response(lists || '[]', {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const tasks = await env.TASKS_KV.get(`tasks:${userEmail}`);
          return new Response(tasks || '[]', {
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

          if (url.pathname.endsWith('/lists')) {
            const list: TaskList = await request.json();
            const existingLists: TaskList[] = JSON.parse(
              (await env.TASKS_KV.get(`lists:${userEmail}`)) || '[]'
            );
            list.id = crypto.randomUUID();
            list.createdAt = Date.now();
            existingLists.push(list);
            await env.TASKS_KV.put(`lists:${userEmail}`, JSON.stringify(existingLists));
            return new Response(JSON.stringify(list), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const newTask: Task = await request.json();
          let existingTasks: Task[] = JSON.parse(
            (await env.TASKS_KV.get(`tasks:${userEmail}`)) || '[]'
          );

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

          newTask.id = crypto.randomUUID();
          newTask.createdAt = Date.now();
          existingTasks.push(newTask);
          await env.TASKS_KV.put(`tasks:${userEmail}`, JSON.stringify(existingTasks));
          return new Response(JSON.stringify(newTask), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        case 'PUT':
          const taskToUpdate: Task = await request.json();
          const updateId = url.pathname.split('/').pop();
          
          existingTasks = JSON.parse(
            (await env.TASKS_KV.get(`tasks:${userEmail}`)) || '[]'
          );
          
          const taskIndex = existingTasks.findIndex(t => t.id === updateId);
          if (taskIndex === -1) {
            return new Response('Task not found', { 
              status: 404, 
              headers: corsHeaders 
            });
          }

          // Preserve creation date and ID while updating other fields
          const updatedTask = {
            ...taskToUpdate,
            id: updateId,
            createdAt: existingTasks[taskIndex].createdAt
          };

          existingTasks[taskIndex] = updatedTask;
          await env.TASKS_KV.put(`tasks:${userEmail}`, JSON.stringify(existingTasks));

          return new Response(JSON.stringify(updatedTask), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        case 'DELETE':
          const deleteId = url.pathname.split('/').pop();
          existingTasks = JSON.parse(
            (await env.TASKS_KV.get(`tasks:${userEmail}`)) || '[]'
          );
          const updatedTasks = existingTasks.filter((t) => t.id !== deleteId);
          await env.TASKS_KV.put(`tasks:${userEmail}`, JSON.stringify(updatedTasks));
          return new Response(null, {
            status: 204,
            headers: corsHeaders,
          });

        default:
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
      }
    } catch (error) {
      return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
    }
  },
};
