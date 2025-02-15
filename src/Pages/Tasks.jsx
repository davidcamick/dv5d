import { useState, useEffect } from 'react';
import { getUserEmail } from '../utils/auth';

const WORKER_URL = 'YOUR_WORKER_URL'; // Add your worker URL

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  const fetchTasks = async () => {
    const response = await fetch(WORKER_URL, {
      headers: { 'X-User-Email': getUserEmail() }
    });
    const data = await response.json();
    setTasks(data);
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': getUserEmail()
      },
      body: JSON.stringify({
        text: newTask,
        completed: false
      })
    });

    setNewTask('');
    fetchTasks();
  };

  const deleteTask = async (id) => {
    await fetch(`${WORKER_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'X-User-Email': getUserEmail() }
    });
    fetchTasks();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Tasks</h1>
      
      <form onSubmit={addTask} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
            placeholder="Add a new task..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
            <span>{task.text}</span>
            <button
              onClick={() => deleteTask(task.id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
