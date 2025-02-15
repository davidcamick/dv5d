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
  dueDate?: number;
  tags: string[];
  color?: string;
  links: {
    url: string;
    preview?: {
      title: string;
      description: string;
      image: string;
    }
  }[];
  priority: 'low' | 'medium' | 'high';
  notes?: string;
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
          const task: Task = await request.json();
          const existingTasks: Task[] = JSON.parse(
            (await env.TASKS_KV.get(`tasks:${userEmail}`)) || '[]'
          );
          task.id = crypto.randomUUID();
          task.createdAt = Date.now();
          existingTasks.push(task);
          await env.TASKS_KV.put(`tasks:${userEmail}`, JSON.stringify(existingTasks));
          return new Response(JSON.stringify(task), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        case 'DELETE':
          const taskId = url.pathname.split('/').pop();
          const currentTasks: Task[] = JSON.parse(
            (await env.TASKS_KV.get(`tasks:${userEmail}`)) || '[]'
          );
          const updatedTasks = currentTasks.filter((t) => t.id !== taskId);
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
