import { useState, useEffect, useMemo } from 'react';
import { getUserEmail } from '../utils/auth';
import TaskEditor from '../components/ui/TaskEditor';
import { 
  PlusIcon, PencilSquareIcon as PencilIcon,
  CalendarDaysIcon as CalendarIcon, TagIcon,
  ChevronDownIcon, ChevronUpIcon, CheckIcon,
  ArrowUpIcon, ArrowDownIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';
import { AnimatedGridPattern } from '../components/ui/AnimatedGridPattern';
import { AuroraText } from '../components/ui/AuroraText';
import { MagicCard } from '../components/ui/MagicCard';
import { MagicButton } from '../components/ui/MagicButton';

const WORKER_URL = 'https://dv5d-tasks.accounts-abd.workers.dev';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: null });
  const [deletedTasks, setDeletedTasks] = useState(new Map()); // Track deleted tasks for undo
  const [undoTimers, setUndoTimers] = useState(new Map()); // Track undo timers
  const [isRefreshing, setIsRefreshing] = useState(false); // Add this state
  const [error, setError] = useState(null);
  const [pendingTasks, setPendingTasks] = useState(new Map()); // Track tasks waiting for confirmation
  const [quickPollTimer, setQuickPollTimer] = useState(null);
  const [pageMount, setPageMount] = useState(true);

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
  const fetchTasks = async (retries = MAX_RETRIES) => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const response = await fetch(WORKER_URL);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const serverTasks = await response.json();
      setTasks(serverTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (retries > 0) {
        setTimeout(() => fetchTasks(retries - 1), RETRY_DELAY);
      } else {
        setError('Failed to load tasks. Please try again later.');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Simplified manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(WORKER_URL);
      if (!response.ok) throw new Error('Failed to fetch');
      const serverTasks = await response.json();
      setTasks(serverTasks);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update polling to be more efficient
  useEffect(() => {
    fetchTasks();
  }, []); // Remove pendingChanges dependency

  // Remove the loading state since we'll always be updating
  const [loading, setLoading] = useState(false);

  // Fix handleSaveTask function
  const handleSaveTask = async (taskData) => {
    let newId;
    let fullTaskData;

    try {
      const isNewTask = !taskData.id;
      newId = isNewTask ? crypto.randomUUID() : taskData.id;
      
      fullTaskData = {
        ...taskData,
        id: newId,
        createdAt: isNewTask ? Date.now() : taskData.createdAt
      };

      // Show pending state
      setPendingTasks(prev => new Map(prev).set(newId, fullTaskData));
      
      // API call
      const method = isNewTask ? 'POST' : 'PUT';
      const url = isNewTask ? WORKER_URL : `${WORKER_URL}/${newId}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullTaskData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save task');
      }

      // Get fresh task list from server
      const freshResponse = await fetch(WORKER_URL);
      if (!freshResponse.ok) throw new Error('Failed to fetch updated tasks');
      
      const serverTasks = await freshResponse.json();
      setTasks(serverTasks);
      
      // Clear pending state
      setPendingTasks(prev => {
        const next = new Map(prev);
        next.delete(newId);
        return next;
      });
      
      // UI updates
      setIsEditorOpen(false);
      setEditingTask(null);
      
    } catch (error) {
      console.error('Error saving task:', error);
      // Only remove from pending if we have the task data
      if (newId) {
        setPendingTasks(prev => {
          const next = new Map(prev);
          next.delete(newId);
          return next;
        });
      }
      setError('Failed to save task. Please try again.');
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
          
          // Fetch updated task list after successful deletion
          await fetchTasks();
        } catch (error) {
          console.error('Error deleting task:', error);
          setError('Failed to delete task. Please try again.');
        }
      }, 10000); // 10 second delay

      // Store timer ID for cleanup
      setUndoTimers(prev => new Map(prev).set(id, timerId));

      // Remove the alert
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Failed to delete task. Please try again.');
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
      if (quickPollTimer) clearTimeout(quickPollTimer);
    };
  }, [undoTimers, quickPollTimer]);

  const openEditor = (task = null) => {
    setEditingTask(task ? task : { 
      text: '',
      dueDate: null,
      priority: 'medium',
      tags: [],
      links: [],
      color: '#ffffff', // Set default color to white
      notes: '',
      completed: false,  // Add this
      createdAt: Date.now()  // Add this
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

  // Simplified task completion
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
    
    try {
      // Make the API call first
      const response = await fetch(`${WORKER_URL}/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedTask)
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Update local state after successful API call
      setTasks(prev => prev.map(t => 
        t.id === task.id ? updatedTask : t
      ));

      if (updatedTask.completed) {
        setShowCompleted(false);
      }
    } catch (error) {
      setError('Failed to update task status. Please try again.');
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

  useEffect(() => {
    setTimeout(() => {
      setPageMount(false);
    }, 1000); // Disable animations after 1 second
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
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

    return `${dateStr} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const TaskItem = ({ task, index, ...props }) => (
    <div 
      className={`relative ${pendingTasks.has(task.id) ? 'opacity-50' : ''}`}
      style={{ 
        animationDelay: pageMount ? `${0.4 + (index * 0.1)}s` : '0s',
        animation: pageMount ? 'fadeIn 0.5s ease forwards' : 'none'
      }}
    >
      <MagicCard
        gradientFrom={task.color || '#4299E1'}
        gradientTo={task.priority === 'high' ? '#F56565' : 
                   task.priority === 'medium' ? '#ED8936' : '#48BB78'}
        className="w-full"
      >
        <div className="p-4 w-full">
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
                  {formatDateTime(task.dueDate)}
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
      </MagicCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      <AnimatedGridPattern 
        className="absolute inset-0 z-0 opacity-50"
        width={32}
        height={32}
        numSquares={75}
        maxOpacity={0.15}
        duration={3}
      />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header with new animation classes */}
        <div className={`flex justify-between items-center mb-8 ${pageMount ? 'animate-fadeIn' : ''}`}>
          <AuroraText as="h1" className="text-3xl font-bold">
            Welcome, Sir Camick
          </AuroraText>
          <MagicButton
            onClick={() => openEditor()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            
            New Task
          </MagicButton>
        </div>

        {/* Controls with new animation classes */}
        <div className={`flex gap-4 mb-4 ${pageMount ? 'animate-fadeIn delay-200' : ''}`}>
          <button
            onClick={handleManualRefresh}
            className={`p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all
              ${isRefreshing ? 'animate-spin text-blue-400' : ''}`}
            disabled={isRefreshing}
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
          
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

        {/* Tags with new animation classes */}
        {availableTags.length > 0 && (
          <div className={`mb-6 flex flex-wrap gap-2 ${pageMount ? 'animate-fadeIn delay-300' : ''}`}>
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
        <div className="space-y-4 mb-8 transition-all">
          {activeTasks.map((task, index) => (
            <TaskItem 
              key={task.id} 
              task={task}
              index={index}
            />
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
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add undo button for recently deleted tasks */}
        {deletedTasks.size > 0 && (
          <div className="fixed bottom-4 right-4">
            <div className="bg-gray-800/90 p-4 rounded-lg shadow-lg flex items-center gap-4">
              <div className="flex flex-col gap-2">
                {Array.from(deletedTasks).map(([id, task]) => (
                  <div key={id} className="flex items-center gap-2">
                    <button
                      onClick={() => undoDelete(id)}
                      className="text-sm px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      Undo
                    </button>
                    <span className="text-gray-400 text-sm">Deleted: {task.text}</span>
                  </div>
                ))}
              </div>
            </div>
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

        {/* Add error display */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
