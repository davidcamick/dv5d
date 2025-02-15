import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { CirclePicker } from 'react-color';
import { getUserEmail } from '../../utils/auth';
import "react-datepicker/dist/react-datepicker.css";

const WORKER_URL = 'https://dv5d-tasks.accounts-abd.workers.dev';

export default function TaskEditor({ task, availableTags = [], onSave, onClose }) {
  const [editedTask, setEditedTask] = useState(task || {
    text: '',
    dueDate: null,
    priority: 'medium',
    tags: [],
    links: [],
    color: '#1e40af',
    notes: ''
  });

  const [newTag, setNewTag] = useState('');
  const [newLink, setNewLink] = useState('');

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(editedTask);
    }
  };

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('task-text-input')?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const addTag = (e) => {
    e.preventDefault();
    if (newTag.trim()) {
      setEditedTask(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const addLink = async (e) => {
    e.preventDefault();
    if (newLink.trim()) {
      try {
        const response = await fetch(`${WORKER_URL}/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: newLink.trim() })
        });
        
        const preview = await response.json();
        
        setEditedTask(prev => ({
          ...prev,
          links: [...(prev.links || []), { 
            url: newLink.trim(),
            preview
          }]
        }));
        setNewLink('');
      } catch (error) {
        console.error('Error fetching preview:', error);
        // Add link without preview if fetch fails
        setEditedTask(prev => ({
          ...prev,
          links: [...(prev.links || []), { url: newLink.trim() }]
        }));
        setNewLink('');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">
          {task ? 'Edit Task' : 'New Task'}
        </h2>

        <div className="space-y-4">
          <input
            id="task-text-input"
            type="text"
            value={editedTask.text}
            onChange={e => setEditedTask(prev => ({ ...prev, text: e.target.value }))}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg"
            placeholder="Task description..."
          />

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-gray-400 mb-2">Due Date & Time</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    if (date) {
                      // Preserve existing time if there is one
                      const existingDate = editedTask.dueDate ? new Date(editedTask.dueDate) : new Date();
                      date.setHours(existingDate.getHours(), existingDate.getMinutes());
                    }
                    setEditedTask(prev => ({ ...prev, dueDate: date ? date.getTime() : null }));
                  }}
                  className="bg-gray-700 text-white rounded px-3 py-2 w-full"
                />
                {editedTask.dueDate && (
                  <input
                    type="time"
                    value={editedTask.dueDate ? new Date(editedTask.dueDate).toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const date = new Date(editedTask.dueDate);
                      date.setHours(hours, minutes);
                      setEditedTask(prev => ({ ...prev, dueDate: date.getTime() }));
                    }}
                    className="bg-gray-700 text-white rounded px-3 py-2"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Priority</label>
              <select
                value={editedTask.priority}
                onChange={e => setEditedTask(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Color</label>
            <CirclePicker
              color={editedTask.color}
              onChange={color => setEditedTask(prev => ({ ...prev, color: color.hex }))}
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Tags</label>
            {/* Add available tags section */}
            {availableTags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {availableTags
                  .filter(tag => !editedTask.tags?.includes(tag))
                  .map(tag => (
                    <button
                      key={tag}
                      onClick={() => setEditedTask(prev => ({
                        ...prev,
                        tags: [...(prev.tags || []), tag]
                      }))}
                      className="px-2 py-1 text-sm bg-gray-700 text-gray-300 rounded-full 
                               hover:bg-blue-500 hover:text-white transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            )}
            {/* Existing tags */}
            <div className="flex gap-2 mb-2">
              {editedTask.tags?.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-500 text-white rounded-full text-sm">
                  {tag}
                  <button
                    onClick={() => setEditedTask(prev => ({
                      ...prev,
                      tags: prev.tags.filter(t => t !== tag)
                    }))}
                    className="ml-2 text-white/75 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {/* Add new tag form */}
            <form onSubmit={addTag} className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg"
                placeholder="Add new tag..."
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                Add
              </button>
            </form>
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Links</label>
            <div className="space-y-2 mb-2">
              {editedTask.links?.map(link => (
                <div key={link.url} className="flex items-center gap-2">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-400 hover:underline flex-1">
                    {link.url}
                  </a>
                  <button
                    onClick={() => setEditedTask(prev => ({
                      ...prev,
                      links: prev.links.filter(l => l.url !== link.url)
                    }))}
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={addLink} className="flex gap-2">
              <input
                type="text"
                value={newLink}
                onChange={e => setNewLink(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg"
                placeholder="Add link..."
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                Add
              </button>
            </form>
          </div>

          <textarea
            value={editedTask.notes}
            onChange={e => setEditedTask(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg"
            placeholder="Additional notes..."
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedTask)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
