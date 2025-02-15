interface Env {
  TASKS_KV: KVNamespace;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const userEmail = request.headers.get('X-User-Email');
    if (!userEmail) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Email',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (request.method) {
        case 'GET':
          const tasks = await env.TASKS_KV.get(`tasks:${userEmail}`);
          return new Response(tasks || '[]', {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        case 'POST':
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
