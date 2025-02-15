import { fetchLinkPreview } from './link-preview';

interface Env {
  DB: D1Database;
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

// Add validation helper
function sanitizeTask(task: Partial<Task>): Task {
  return {
    id: task.id || crypto.randomUUID(),
    text: task.text || '',
    completed: Boolean(task.completed),
    createdAt: task.createdAt || Date.now(),
    dueDate: task.dueDate || null,
    priority: task.priority || 'medium',
    color: task.color || '#ffffff',
    notes: task.notes || '',
    tags: task.tags || [],
    links: task.links || []
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const taskId = url.pathname.split('/')[1];

      switch (request.method) {
        case 'GET':
          const { results } = await env.DB
            .prepare('SELECT * FROM tasks ORDER BY created_at DESC')
            .all();

          // Parse JSON strings back to arrays
          const tasks = results.map((task: any) => ({
            ...task,
            tags: JSON.parse(task.tags || '[]'),
            links: JSON.parse(task.links || '[]')
          }));

          return new Response(JSON.stringify(tasks), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'POST':
          const newTask = sanitizeTask(await request.json());
          
          await env.DB
            .prepare(`
              INSERT INTO tasks (id, text, completed, created_at, due_date, priority, 
                               color, notes, tags, links)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              newTask.id,
              newTask.text,
              newTask.completed ? 1 : 0,
              newTask.createdAt,
              newTask.dueDate,
              newTask.priority,
              newTask.color,
              newTask.notes,
              JSON.stringify(newTask.tags),
              JSON.stringify(newTask.links)
            )
            .run();

          return new Response(JSON.stringify(newTask), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'PUT':
          if (!taskId) throw new Error('Task ID required');
          const taskToUpdate = sanitizeTask(await request.json());

          await env.DB
            .prepare(`
              UPDATE tasks 
              SET text = ?, completed = ?, due_date = ?, priority = ?,
                  color = ?, notes = ?, tags = ?, links = ?
              WHERE id = ?
            `)
            .bind(
              taskToUpdate.text,
              taskToUpdate.completed ? 1 : 0,
              taskToUpdate.dueDate,
              taskToUpdate.priority,
              taskToUpdate.color,
              taskToUpdate.notes,
              JSON.stringify(taskToUpdate.tags),
              JSON.stringify(taskToUpdate.links),
              taskId
            )
            .run();

          return new Response(JSON.stringify(taskToUpdate), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'DELETE':
          if (!taskId) throw new Error('Task ID required');
          
          await env.DB
            .prepare('DELETE FROM tasks WHERE id = ?')
            .bind(taskId)
            .run();

          return new Response(null, {
            status: 204,
            headers: corsHeaders
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
        JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  }
};
