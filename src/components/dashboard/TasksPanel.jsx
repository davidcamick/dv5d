import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { AuroraText } from '../ui/AuroraText';

const WORKER_URL = 'https://dv5d-tasks.accounts-abd.workers.dev';

// Add the formatDateTime helper
const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let dateStr;
  if (date.toDateString() === today.toDateString()) {
    dateStr = 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = date.toLocaleDateString();
  }

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
};

const Task = ({ task }) => (
  <Link 
    to="/tasks" 
    className="block p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-all"
  >
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <span 
          className="text-lg"
          style={{ color: task.color || '#fff' }}
        >
          {task.text}
        </span>
        {task.priority && (
          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
            task.priority === 'high' ? 'bg-red-500' :
            task.priority === 'medium' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`}>
            {task.priority}
          </span>
        )}
        {task.due_date && (
          <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
            <CalendarIcon className="w-4 h-4" />
            <span>{formatDateTime(task.due_date)}</span>
          </div>
        )}
      </div>
    </div>
  </Link>
);

export default function TasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(false);
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

  // Update the getTodayTaskCount to be more accurate
  const getTodayTaskCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter(task => {
      if (!task.due_date || task.completed) return false;
      const taskDate = new Date(task.due_date);
      return taskDate >= today && taskDate < tomorrow;
    }).length;
  };

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
            {getTodayTaskCount()} Today
          </div>
          <div className="px-3 py-1 bg-gray-500 rounded-lg">
            {completedTasks.length} Done
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="space-y-2">
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map(task => (
              <div key={task.id} className="p-3 bg-gray-700/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-white">{task.text}</span>
                  <div className="flex items-center gap-2">
                    {task.priority && (
                      <span className={`px-2 py-0.5 text-xs text-white rounded ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-sm text-gray-300">
                        {formatDateTime(task.due_date)}
                      </span>
                    )}
                  </div>
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
