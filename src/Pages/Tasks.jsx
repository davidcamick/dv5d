import { useState, useEffect, useMemo } from 'react';
import { getUserEmail } from '../utils/auth';
import TaskEditor from '../components/ui/TaskEditor';
import { 
  PlusIcon, PencilSquareIcon as PencilIcon,
  CalendarDaysIcon as CalendarIcon, TagIcon,
  ChevronDownIcon, ChevronUpIcon 
} from '@heroicons/react/24/outline';

const WORKER_URL = 'https://dv5d-tasks.accounts-abd.workers.dev';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  // Get unique tags from all tasks
  const availableTags = useMemo(() => {
    const tags = new Set();
    tasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [tasks]);

  // Filter tasks based on completion and selected tags
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesCompletion = showCompleted ? task.completed : !task.completed;
      const matchesTags = selectedTags.length === 0 || 
        task.tags?.some(tag => selectedTags.includes(tag));
      return matchesCompletion && matchesTags;
    });
  }, [tasks, showCompleted, selectedTags]);

  const fetchTasks = async () => {
    try {
      console.log('Fetching tasks...');
      const response = await fetch(WORKER_URL, {
        headers: { 
          'X-User-Email': getUserEmail(),
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (taskData) => {
    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': getUserEmail()
        },
        body: JSON.stringify(taskData)
      });
      if (!response.ok) throw new Error('Failed to save task');
      fetchTasks();
      setIsEditorOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const deleteTask = async (id) => {
    try {
      const response = await fetch(`${WORKER_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-Email': getUserEmail() }
      });
      if (!response.ok) throw new Error('Failed to delete task');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const openEditor = (task = null) => {
    setEditingTask(task);
    setIsEditorOpen(true);
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">My Tasks</h1>
          <button
            onClick={() => openEditor()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            New Task
          </button>
        </div>

        {/* Tag filters */}
        {availableTags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Active tasks */}
        <div className="space-y-4 mb-8">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-gray-800/50 rounded-lg p-4 shadow-lg hover:bg-gray-800/70 transition-all"
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleSaveTask({ ...task, completed: !task.completed })}
                  className="mt-1.5 rounded border-gray-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-white text-lg ${task.completed ? 'line-through opacity-50' : ''}`}>
                      {task.text}
                    </span>
                    {task.priority && (
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </div>

                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                      <CalendarIcon className="w-4 h-4" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}

                  {task.tags?.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <TagIcon className="w-4 h-4 text-gray-400" />
                      {task.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-700 rounded-full text-xs text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {task.links?.map(link => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block p-2 rounded bg-gray-700/50 hover:bg-gray-700/70 text-blue-400 text-sm"
                    >
                      {link.url}
                    </a>
                  ))}

                  {task.notes && (
                    <p className="mt-2 text-gray-400 text-sm whitespace-pre-wrap">
                      {task.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditor(task)}
                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-red-400 hover:text-red-500 rounded-lg hover:bg-gray-700/50"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Completed tasks section */}
        {tasks.some(task => task.completed) && (
          <div className="mt-8 border-t border-gray-700 pt-4">
            <button
              onClick={() => setShowCompleted(prev => !prev)}
              className="flex items-center gap-2 text-gray-400 hover:text-white"
            >
              {showCompleted ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
              Completed Tasks ({tasks.filter(t => t.completed).length})
            </button>
          </div>
        )}

        {isEditorOpen && (
          <TaskEditor
            task={editingTask}
            onSave={handleSaveTask}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingTask(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
