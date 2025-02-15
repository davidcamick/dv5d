import { useState, useEffect, useMemo } from 'react';
import { getUserEmail } from '../utils/auth';
import TaskEditor from '../components/ui/TaskEditor';
import { 
  PlusIcon, PencilSquareIcon as PencilIcon,
  CalendarDaysIcon as CalendarIcon, TagIcon,
  ChevronDownIcon, ChevronUpIcon, CheckIcon,
  ArrowUpIcon, ArrowDownIcon
} from '@heroicons/react/24/outline';

const WORKER_URL = 'https://dv5d-tasks.accounts-abd.workers.dev';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: null });
  const [deletedTasks, setDeletedTasks] = useState(new Map()); // Track deleted tasks for undo
  const [undoTimers, setUndoTimers] = useState(new Map()); // Track undo timers
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [pendingChanges, setPendingChanges] = useState(false);

  // Get unique tags from all tasks
  const availableTags = useMemo(() => {
    const tags = new Set();
    tasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [tasks]);

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field: field,
      direction: prev.field === field 
        ? prev.direction === 'asc'
          ? 'desc'
          : prev.direction === 'desc'
            ? null
            : 'asc'
        : 'asc'
    }));
  };

  const getSortedTasks = (tasks) => {
    if (!sortConfig.field) return tasks;
    
    return [...tasks].sort((a, b) => {
      if (sortConfig.field === 'date') {
        const aDate = a.dueDate || a.createdAt;
        const bDate = b.dueDate || b.createdAt;
        return sortConfig.direction === 'asc' 
          ? aDate - bDate 
          : bDate - aDate;
      }
      
      if (sortConfig.field === 'priority') {
        const priorities = { high: 3, medium: 2, low: 1 };
        const aValue = priorities[a.priority] || 0;
        const bValue = priorities[b.priority] || 0;
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
  };

  // Separate active and completed tasks
  const activeTasks = useMemo(() => {
    const filtered = tasks.filter(task => !task.completed && (
      selectedTags.length === 0 || task.tags?.some(tag => selectedTags.includes(tag))
    ));
    return getSortedTasks(filtered);
  }, [tasks, selectedTags, sortConfig]);

  const completedTasks = useMemo(() => {
    const filtered = tasks.filter(task => task.completed && (
      selectedTags.length === 0 || task.tags?.some(tag => selectedTags.includes(tag))
    ));
    return getSortedTasks(filtered);
  }, [tasks, selectedTags, sortConfig]);

  // Debounce the fetch to prevent excessive API calls
  const debouncedFetch = useMemo(() => {
    let timeoutId;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(fetchTasks, 200);
    };
  }, []);

  // Optimize fetch to only run when needed
  const fetchTasks = async () => {
    try {
      const response = await fetch(WORKER_URL, {
        headers: { 
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      if (JSON.stringify(data) !== JSON.stringify(tasks)) {
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Update polling to be more efficient
  useEffect(() => {
    fetchTasks();
    const intervalId = setInterval(() => {
      if (!pendingChanges) {
        fetchTasks();
      }
    }, 2000); // Reduced polling frequency to 2 seconds

    return () => clearInterval(intervalId);
  }, [pendingChanges]);

  // Remove the loading state since we'll always be updating
  const [loading, setLoading] = useState(false);

  // Optimize save task
  const handleSaveTask = async (taskData) => {
    try {
      // Optimistic update
      if (taskData.id) {
        setTasks(prev => prev.map(t => 
          t.id === taskData.id ? taskData : t
        ));
      } else {
        const newTask = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: Date.now()
        };
        setTasks(prev => [...prev, newTask]);
        taskData = newTask;
      }

      setIsEditorOpen(false);
      setEditingTask(null);
      setPendingChanges(true);

      // Background save
      const method = taskData.id ? 'PUT' : 'POST';
      const response = await fetch(WORKER_URL + (taskData.id ? `/${taskData.id}` : ''), {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) throw new Error('Failed to save task');
      debouncedFetch();
    } catch (error) {
      console.error('Error saving task:', error);
      setPendingChanges(false);
    }
  };

  // Modify deleteTask to support undo
  const deleteTask = async (id) => {
    try {
      // Store the task for potential undo
      const taskToDelete = tasks.find(t => t.id === id);
      setDeletedTasks(prev => new Map(prev).set(id, taskToDelete));
      
      // Optimistically remove from UI
      setTasks(prev => prev.filter(t => t.id !== id));

      // Set up timer for actual deletion
      const timerId = setTimeout(async () => {
        try {
          const response = await fetch(`${WORKER_URL}/${id}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) throw new Error('Failed to delete task');
          
          // Clean up undo state
          setDeletedTasks(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
        } catch (error) {
          console.error('Error deleting task:', error);
        }
      }, 10000); // 10 second delay

      // Store timer ID for cleanup
      setUndoTimers(prev => new Map(prev).set(id, timerId));

      // Show toast notification
      // You might want to add a toast library like react-hot-toast
      alert('Task deleted. You have 10 seconds to undo.');
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Add undo function
  const undoDelete = (id) => {
    // Clear the deletion timer
    clearTimeout(undoTimers.get(id));
    setUndoTimers(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });

    // Restore the task
    const taskToRestore = deletedTasks.get(id);
    if (taskToRestore) {
      setTasks(prev => [...prev, taskToRestore]);
      setDeletedTasks(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      undoTimers.forEach(timerId => clearTimeout(timerId));
    };
  }, [undoTimers]);

  const openEditor = (task = null) => {
    setEditingTask(task ? task : { 
      text: '',
      dueDate: null,
      priority: 'medium',
      tags: [],
      links: [],
      color: '#ffffff', // Set default color to white
      notes: ''
    });
    setIsEditorOpen(true);
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Optimize task completion
  const handleTaskCompletion = async (task) => {
    const taskElement = document.getElementById(`task-${task.id}`);
    const containerElement = taskElement?.parentElement;
    
    if (containerElement && !task.completed) {
      containerElement.style.minHeight = `${taskElement.offsetHeight}px`;
      requestAnimationFrame(() => {
        taskElement.classList.add('task-completing');
        containerElement.classList.add('completing');
      });
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const updatedTask = { ...task, completed: !task.completed };
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === task.id ? updatedTask : t
    ));
    setPendingChanges(true);

    if (updatedTask.completed) {
      setShowCompleted(false);
    }

    // Background save
    try {
      await handleSaveTask(updatedTask);
    } catch (error) {
      // Revert on error
      setTasks(prev => prev.map(t => 
        t.id === task.id ? task : t
      ));
      setPendingChanges(false);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !isEditorOpen) {
        e.preventDefault();
        openEditor();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isEditorOpen]);

  // Add function to count upcoming tasks
  const getUpcomingTaskCount = () => {
    const twoDaysFromNow = Date.now() + (2 * 24 * 60 * 60 * 1000);
    return tasks.filter(task => 
      !task.completed && 
      task.dueDate && 
      task.dueDate <= twoDaysFromNow
    ).length;
  };

  // Update document title when tasks change
  useEffect(() => {
    const upcomingCount = getUpcomingTaskCount();
    document.title = upcomingCount > 0 ? `dv5d - ${upcomingCount}` : 'dv5d';
  }, [tasks]);

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header with fade-in */}
        <div className="flex justify-between items-center mb-8 fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-3xl font-bold text-white">Welcome, Sir Camick</h1>
          <button
            onClick={() => openEditor()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            New Task
          </button>
        </div>

        {/* Sort controls with fade-in */}
        <div className="flex gap-4 mb-4 fade-in" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={() => handleSort('date')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1 ${
              sortConfig.field === 'date' && sortConfig.direction
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Sort by Date
            {sortConfig.field === 'date' && sortConfig.direction && (
              sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> :
              <ArrowDownIcon className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={() => handleSort('priority')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1 ${
              sortConfig.field === 'priority' && sortConfig.direction
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Sort by Priority
            {sortConfig.field === 'priority' && sortConfig.direction && (
              sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> :
              <ArrowDownIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Tag filters with fade-in */}
        {availableTags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 fade-in" style={{ animationDelay: '0.3s' }}>
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

        {/* Active tasks with staggered animation */}
        <div className="space-y-4 mb-8 transition-all stagger-children">
          {activeTasks.map((task, index) => (
            <div 
              key={task.id} 
              className="task-item-container"
              style={{ animationDelay: `${0.4 + (index * 0.1)}s` }}
            >
              <div
                id={`task-${task.id}`}
                className="bg-gray-800/50 rounded-lg p-4 shadow-lg hover:bg-gray-800/70 transition-all task-item"
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleTaskCompletion(task)}
                    className="custom-checkbox mt-1.5 w-5 h-5 rounded-full border-2 border-gray-400 
                             hover:border-white flex items-center justify-center 
                             transition-all hover:scale-110 focus:outline-none 
                             group relative"
                  >
                    <CheckIcon 
                      className="w-4 h-4 text-white transform scale-0 
                               group-hover:scale-75 transition-transform absolute" 
                    />
                  </button>
                  <div className="flex-1 transform-gpu transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <span 
                        className={`text-lg ${task.completed ? 'line-through opacity-50' : ''}`}
                        style={{ color: task.color || '#fff' }}
                      >
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
            </div>
          ))}
          {activeTasks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No active tasks {selectedTags.length > 0 ? 'with selected tags' : ''}
            </div>
          )}
        </div>

        {/* Completed tasks section with fade-in */}
        {completedTasks.length > 0 && (
          <div className="mt-8 border-t border-gray-700 pt-4 fade-in" style={{ animationDelay: '0.5s' }}>
            <button
              onClick={() => setShowCompleted(prev => !prev)}
              className="flex items-center gap-2 text-gray-400 hover:text-white w-full"
            >
              {showCompleted ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
              <span>Completed Tasks ({completedTasks.length})</span>
            </button>

            {showCompleted && (
              <div className="space-y-4 mt-4 opacity-75">
                {completedTasks.map((task) => (
                  <div key={task.id} className="bg-gray-800/30 rounded-lg p-4 shadow-lg">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleTaskCompletion(task)}
                        className="custom-checkbox mt-1.5 w-5 h-5 rounded-full border-2 border-gray-400 
                                 hover:border-white flex items-center justify-center 
                                 transition-all hover:scale-110 focus:outline-none 
                                 group relative"
                      >
                        <CheckIcon 
                          className="w-4 h-4 text-white transform scale-0 
                                   group-hover:scale-75 transition-transform absolute" 
                        />
                      </button>
                      <div className="flex-1 transform-gpu transition-all duration-300">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`text-lg ${task.completed ? 'line-through opacity-50' : ''}`}
                            style={{ color: task.color || '#fff' }}
                          >
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
            )}
          </div>
        )}

        {/* Add undo button for recently deleted tasks */}
        {deletedTasks.size > 0 && (
          <div className="fixed bottom-4 right-4 space-y-2">
            {Array.from(deletedTasks).map(([id, task]) => (
              <div key={id} className="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center gap-4">
                <span className="text-gray-300">Task deleted: {task.text}</span>
                <button
                  onClick={() => undoDelete(id)}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Undo
                </button>
              </div>
            ))}
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
