import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuroraText } from '../ui/AuroraText';

const WORKER_URL = 'https://dv5d-tasks.accounts-abd.workers.dev';

export default function TasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(WORKER_URL);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const todayTasks = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(t.dueDate);
    return dueDate.toDateString() === today.toDateString();
  });

  const upcomingTasks = [...activeTasks]
    .sort((a, b) => (a.dueDate || Infinity) - (b.dueDate || Infinity))
    .slice(0, 5);

  return (
    <Link
      to="/tasks"
      className="bg-gray-800/70 rounded-xl p-6 backdrop-blur-sm shadow-lg border border-gray-700/50 hover:bg-gray-800/80 transition-all"
    >
      <div className="flex justify-between items-center mb-4">
        <AuroraText as="h2" className="text-xl font-semibold">
          Tasks
        </AuroraText>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-blue-500 rounded-lg">
            {activeTasks.length} Active
          </div>
          <div className="px-3 py-1 bg-green-500 rounded-lg">
            {todayTasks.length} Today
          </div>
          <div className="px-3 py-1 bg-gray-500 rounded-lg">
            {completedTasks.length} Done
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="space-y-2">
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map(task => (
              <div key={task.id} className="p-3 bg-gray-700/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span>{task.text}</span>
                  {task.dueDate && (
                    <span className="text-sm text-gray-300">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 italic">
              Nothing here, get to work bro! 💪
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
