import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PlusIcon, 
  CalendarDaysIcon as CalendarIcon, 
  TagIcon, 
  LinkIcon 
} from '@heroicons/react/24/outline';

export default function TaskList({ list, tasks, onAddTask, onUpdateTask, onDeleteTask }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500'
  };

  return (
    <div className="rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{list.name}</h2>
        <Badge style={{ backgroundColor: list.color }}>{tasks.length} tasks</Badge>
      </div>

      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} 
               className="group flex items-start gap-4 rounded-lg bg-gray-800/50 p-4 hover:bg-gray-800/70 transition-all">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onUpdateTask({ ...task, completed: !task.completed })}
              className="mt-1 rounded border-gray-600"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-white ${task.completed ? 'line-through opacity-50' : ''}`}>
                  {task.text}
                </span>
                {task.priority && (
                  <Badge className={priorityColors[task.priority]}>
                    {task.priority}
                  </Badge>
                )}
              </div>
              
              {task.dueDate && (
                <div className="text-sm text-gray-400 mt-1">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}

              {task.tags?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {task.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {task.links?.map(link => (
                <a key={link.url} 
                   href={link.url}
                   target="_blank"
                   rel="noopener noreferrer" 
                   className="mt-2 block rounded-lg bg-gray-700/50 p-2 hover:bg-gray-700/70">
                  {link.preview ? (
                    <div className="flex gap-2">
                      <img src={link.preview.image} 
                           alt="" 
                           className="w-20 h-20 object-cover rounded" />
                      <div>
                        <div className="text-sm font-medium text-white">{link.preview.title}</div>
                        <div className="text-xs text-gray-400">{link.preview.description}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-blue-400 text-sm">{link.url}</div>
                  )}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={() => onAddTask(list.id)}
        className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        Add Task
      </Button>
    </div>
  );
}
