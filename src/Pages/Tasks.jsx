import { useState, useEffect, useMemo } from 'react';
import { getUserEmail } from '../utils/auth';
import TaskEditor from '../components/ui/TaskEditor';
import { 
  PlusIcon, PencilSquareIcon as PencilIcon,
  CalendarDaysIcon as CalendarIcon, TagIcon,
  ChevronDownIcon, ChevronUpIcon, CheckIcon,
  ArrowUpIcon, ArrowDownIcon, ArrowPathIcon,
  ArrowLeftIcon, PlusCircleIcon
} from '@heroicons/react/24/outline';
import { AnimatedGridPattern } from '../components/ui/AnimatedGridPattern';
import { AuroraText } from '../components/ui/AuroraText';
import { Link } from 'react-router-dom';
import { PRESET_COLORS } from '../constants/colors';
import { Popover } from '@headlessui/react';

const WORKER_URL = 'https://dv5d-tasks.accounts-abd.workers.dev';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Add this helper function
const parseTimestamp = (timestamp) => {
  if (!timestamp) return null;
  // Handle both string and number timestamps
  const parsedTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  if (isNaN(parsedTimestamp)) return null;
  return parsedTimestamp;
};

const formatDateHeader = (timestamp) => {
  if (!timestamp) return 'No date';
  
  const date = new Date(timestamp);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    // For this week, show day name. For future dates, show full date
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }
};

// Update the groupTasksByDate function
const groupTasksByDate = (tasks) => {
  const groups = new Map();
  
  // First, group tasks with dates
  const datedTasks = tasks.filter(task => task.due_date);
  datedTasks.forEach(task => {
    const dateHeader = formatDateHeader(task.due_date);
    if (!groups.has(dateHeader)) {
      groups.set(dateHeader, []);
    }
    groups.get(dateHeader).push(task);
  });
  
  // Then add tasks with no date at the end
  const noDateTasks = tasks.filter(task => !task.due_date);
  if (noDateTasks.length > 0) {
    groups.set('No date', noDateTasks);
  }
  
  // Convert to array and sort date groups chronologically, keeping "No date" at the end
  const sortedEntries = Array.from(groups.entries()).sort((a, b) => {
    if (a[0] === 'No date') return 1;
    if (b[0] === 'No date') return -1;
    
    // Get first task from each group to compare dates
    const aDate = a[1][0]?.due_date;
    const bDate = b[1][0]?.due_date;
    
    return aDate - bDate;
  });
  
  return new Map(sortedEntries);
};

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

  // Get unique tags from all tasks
  const availableTags = useMemo(() => {
    const tags = new Set();
    tasks.forEach(task => {
      task.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [tasks]);

  const handleSort = (field) => {
    setSortConfig(prev => {
      // For date sorting: toggle between 'date' and null, always ascending
      if (field === 'date') {
        return {
          field: prev.field === 'date' ? null : 'date',
          direction: 'asc'
        };
      }
      
      // For priority sorting: cycle through asc -> desc -> off
      if (field === 'priority') {
        if (prev.field !== 'priority') {
          return { field: 'priority', direction: 'asc' };
        }
        if (prev.direction === 'asc') {
          return { field: 'priority', direction: 'desc' };
        }
        return { field: null, direction: null };
      }

      return prev;
    });
  };

  const getSortedTasks = (tasks) => {
    if (!sortConfig.field) return tasks;
    
    return [...tasks].sort((a, b) => {
      if (sortConfig.field === 'date') {
        const aHasDate = Boolean(a.due_date);
        const bHasDate = Boolean(b.due_date);
        
        // Always keep tasks with dates at the top
        if (aHasDate && !bHasDate) return -1;
        if (!aHasDate && bHasDate) return 1;
        
        // If both have dates, sort by date first
        if (aHasDate && bHasDate) {
          if (a.due_date === b.due_date) {
            // If dates are equal, sort by priority (high to low)
            const priorities = { high: 3, medium: 2, low: 1 };
            return (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
          }
          return a.due_date - b.due_date;
        }
        
        // If neither has a date, sort by priority (high to low)
        const priorities = { high: 3, medium: 2, low: 1 };
        return (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
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
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      
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
      
      // Ensure dueDate is a number
      const dueDate = taskData.dueDate ? Number(taskData.dueDate) : null;
      
      // Convert camelCase to snake_case for API
      fullTaskData = {
        ...taskData,
        id: newId,
        created_at: isNewTask ? Date.now() : taskData.createdAt,
        due_date: taskData.dueDate ? Number(taskData.dueDate) : null
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
      task.due_date && 
      task.due_date <= twoDaysFromNow
    ).length;
  };

  // Update document title when tasks change
  useEffect(() => {
    const upcomingCount = getUpcomingTaskCount();
    document.title = upcomingCount > 0 ? `Tasks (${upcomingCount})` : 'Tasks';
  }, [tasks]);

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  const formatDateTime = (timestamp) => {
    const parsedTimestamp = parseTimestamp(timestamp);
    if (!parsedTimestamp) return '';
    
    const date = new Date(parsedTimestamp);
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

  const TaskItem = ({ task, index }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [newTag, setNewTag] = useState('');
    // Update state: ensure newDueDate is always a string
    const [editingDate, setEditingDate] = useState(false);
    const [newDueDate, setNewDueDate] = useState(task.due_date ? String(task.due_date) : '');

    const handleSaveDate = async () => {
      setIsUpdating(true);
      const updatedTask = {
        ...task,
        dueDate: Number(newDueDate) || null,  // Use camelCase here
        due_date: Number(newDueDate) || null   // Keep snake_case for API compatibility
      };

      try {
        const response = await fetch(`${WORKER_URL}/${task.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedTask)
        });

        if (!response.ok) throw new Error('Failed to update task');
        await fetchTasks();
      } catch (error) {
        console.error('Error updating task:', error);
        setError('Failed to update date. Please try again.');
      } finally {
        setIsUpdating(false);
        setEditingDate(false);
      }
    };

    const handleAddTag = async (tagToAdd) => {
      setIsUpdating(true);
      const updatedTask = {
        ...task,
        tags: [...(task.tags || []), tagToAdd]
      };
  
      try {
        const response = await fetch(`${WORKER_URL}/${task.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedTask)
        });
  
        if (!response.ok) throw new Error('Failed to update task');
        await fetchTasks();
      } catch (error) {
        console.error('Error updating task:', error);
        setError('Failed to update tags. Please try again.');
      } finally {
        setIsUpdating(false);
      }
    };

    const handleRemoveTag = async (tagToRemove) => {
      setIsUpdating(true);
      const updatedTask = {
        ...task,
        tags: task.tags?.filter(tag => tag !== tagToRemove) || []
      };
  
      try {
        const response = await fetch(`${WORKER_URL}/${task.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedTask)
        });
  
        if (!response.ok) throw new Error('Failed to update task');
        await fetchTasks();
      } catch (error) {
        console.error('Error updating task:', error);
        setError('Failed to remove tag. Please try again.');
      } finally {
        setIsUpdating(false);
      }
    };
  
    const TagsPopover = () => (
      <Popover className="relative">
        <Popover.Button
          className={`${task.tags?.length > 0 
            ? 'hover:bg-gray-600/10' // Almost invisible background, slight hover effect
            : 'px-2 py-0.5 bg-gray-700 rounded-full hover:bg-gray-600'
          } text-xs text-gray-300 transition-colors focus:outline-none focus:ring-2 
            focus:ring-blue-500 focus:ring-opacity-50`}
          disabled={isUpdating}
        >
          {task.tags?.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {task.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-gray-600 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            'No Tags'
          )}
        </Popover.Button>
    
        <Popover.Panel
          className="absolute z-[99999] w-64"
          style={{
            top: 'calc(100% + 0.5rem)',
            right: '0',
          }}
        >
          <div 
            className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap gap-1">
              {availableTags.map(tag => {
                const isSelected = task.tags?.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      if (isSelected) {
                        // Remove tag
                        handleRemoveTag(tag);
                      } else {
                        // Add tag
                        handleAddTag(tag);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-full text-xs transition-colors
                      ${isSelected 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    disabled={isUpdating}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {availableTags.length === 0 && (
              <span className="text-gray-400 text-xs">No tags available</span>
            )}
          </div>
        </Popover.Panel>
      </Popover>
    );
  
    return (
      <div className="p-1">
        <div className="relative">
          <div className="relative bg-gray-800/50 rounded-xl p-4 shadow-lg hover:bg-gray-800/70 transition-all group">
            <div className="relative z-10">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleTaskCompletion(task)}
                  className="custom-checkbox mt-1.5 w-5 h-5 rounded-full border-2 border-gray-400 
                          hover:border-white flex items-center justify-center 
                          transition-all hover:scale-110 focus:outline-none group relative"
                >
                  <CheckIcon 
                    className="w-4 h-4 text-white transform scale-0 
                            group-hover:scale-75 transition-transform absolute" 
                  />
                </button>
                <div className="flex-1 transform-gpu transition-all duration-300">
                  {/* Title and Priority Section */}
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

                  {/* Divider Line */}
                  <div className="h-px bg-gray-700/50 my-2"></div>

                  {/* Content Below Divider */}
                  <div className="flex justify-between gap-4">
                    {/* Left Side Content */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-1">
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-300 cursor-pointer"
                          onClick={() => setEditingDate(true)}
                        >
                          <CalendarIcon className="w-4 h-4" />
                          {task.due_date ? formatDateTime(task.due_date) : 'No Date'}
                        </span>
                        {editingDate && (
                          <div className="absolute z-20 mt-2 p-2 bg-gray-900 border border-gray-700 rounded">
                            <input 
                              type="text" 
                              value={newDueDate} 
                              onChange={e => setNewDueDate(e.target.value)}
                              className="px-2 py-1 bg-gray-800 text-white rounded"
                              placeholder="Enter timestamp"
                            />
                            <div className="flex gap-2 mt-2">
                              <button 
                                onClick={handleSaveDate}
                                className="px-2 py-1 bg-green-600 text-white rounded"
                                disabled={isUpdating}
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingDate(false)}
                                className="px-2 py-1 bg-red-600 text-white rounded"
                                disabled={isUpdating}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start">
                        <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-300">
                          {task.notes ? task.notes : 'No Notes'}
                        </span>
                      </div>
                    </div>

                    {/* Right Side Content */}
                    <div className="flex flex-col items-end gap-2">
                      <TagsPopover />
                      <div className="flex flex-col items-end gap-1">
                        {task.links?.length > 0 ? (
                          task.links.map(link => (
                            <a
                              key={link.url}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-right block p-2 rounded bg-gray-700/50 hover:bg-gray-700/70 text-blue-400 text-sm"
                            >
                              {link.url}
                            </a>
                          ))
                        ) : (
                          <span className="text-right block p-2 rounded bg-gray-700/50 text-gray-300 text-sm">
                            No Links
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

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
      </div>
    );
  };

  const TaskGroup = ({ tasks, showDateHeaders }) => {
    if (!showDateHeaders) {
      return (
        <div className="space-y-3"> {/* Increase space between tasks */}
          {tasks.map((task, index) => (
            <TaskItem key={task.id} task={task} index={index} />
          ))}
        </div>
      );
    }

    const groups = groupTasksByDate(tasks);
    return Array.from(groups.entries()).map(([dateHeader, groupTasks]) => (
      <div key={dateHeader} className="mb-8 last:mb-0"> {/* Increase margin between groups */}
        <div className="flex items-center gap-2 mb-3"> {/* Adjust header spacing */}
          <div className="h-px flex-1 bg-gray-700/50"></div>
          <h3 className="text-sm font-medium text-gray-400 px-2">{dateHeader}</h3>
          <div className="h-px flex-1 bg-gray-700/50"></div>
        </div>
        <div className="space-y-3"> {/* Increase space between tasks */}
          {groupTasks.map((task, index) => (
            <TaskItem key={task.id} task={task} index={index} />
          ))}
        </div>
      </div>
    ));
  };

  const Controls = () => (
    <div className="flex flex-wrap gap-4 mb-4">
      <button
        onClick={handleManualRefresh}
        className={`p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all
          ${isRefreshing ? 'animate-spin text-blue-400' : ''}`}
        disabled={isRefreshing}
      >
        <ArrowPathIcon className="w-5 h-5" />
      </button>
      
      {/* Date button - no direction indicator */}
      <button
        onClick={() => handleSort('date')}
        className={`px-3 py-1 rounded-lg flex items-center gap-1 ${
          sortConfig.field === 'date'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Date
      </button>
      
      {/* Priority button - with direction indicator */}
      <button
        onClick={() => handleSort('priority')}
        className={`px-3 py-1 rounded-lg flex items-center gap-1 ${
          sortConfig.field === 'priority'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Priority
        {sortConfig.field === 'priority' && (
          sortConfig.direction === 'asc' 
            ? <ArrowUpIcon className="w-4 h-4" /> 
            : <ArrowDownIcon className="w-4 h-4" />
        )}
      </button>
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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-all"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <AuroraText as="h1" className="text-3xl font-bold">
              Your Tasks
            </AuroraText>
          </div>
          <button 
            onClick={() => openEditor()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            New Task
          </button>
        </div>

        {/* Controls */}
        <Controls />

        {/* Tags section */}
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
        <div className="space-y-4 mb-8 transition-all">
          {activeTasks.length > 0 ? (
            <TaskGroup 
              tasks={activeTasks} 
              showDateHeaders={sortConfig.field === 'date'} 
            />
          ) : (
            <div className="text-center py-8 text-gray-400">
              No active tasks {selectedTags.length > 0 ? 'with selected tags' : ''}
            </div>
          )}
        </div>

        {/* Completed tasks section */}
        {completedTasks.length > 0 && (
          <>
            <div className="border-t border-gray-700/50 my-8" />
            <div className="flex justify-center">
              <button
                onClick={() => setShowCompleted(prev => !prev)}
                className="flex items-center gap-2 text-gray-400 hover:text-white"
              >
                {showCompleted ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                <span>Completed Tasks ({completedTasks.length})</span>
              </button>
            </div>
            {showCompleted && (
              <div className="mt-4 space-y-4 opacity-75">
                <TaskGroup 
                  tasks={completedTasks} 
                  showDateHeaders={sortConfig.field === 'date'} 
                />
              </div>
            )}
          </>
        )}

        {/* Rest of the components (undo, editor, error) remain unchanged */}
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
            availableTags={availableTags}
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
