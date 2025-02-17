import { useState } from 'react';
import { Dialog } from './Dialog';
import { Calendar } from './Calendar';
import { CirclePicker } from 'react-color';
import { 
  CalendarIcon, TagIcon, LinkIcon, XMarkIcon,
  DocumentTextIcon, SwatchIcon
} from '@heroicons/react/24/outline';

export default function TaskEditor({ task, availableTags = [], onSave, onClose }) {
  const [editedTask, setEditedTask] = useState(() => ({
    text: task?.text || '',
    dueDate: task?.dueDate || Date.now(), // Default to today
    priority: task?.priority || 'medium',
    tags: task?.tags || [],
    links: task?.links || [],
    color: task?.color || '#1e40af',
    notes: task?.notes || ''
  }));

  const [activeTab, setActiveTab] = useState('main');
  const [newTag, setNewTag] = useState('');
  const [newLink, setNewLink] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleQuickDateSet = (preset) => {
    let newTimestamp;
    
    if (preset === 'remove') {
      newTimestamp = null;
    } else {
      const now = new Date();
      if (preset === 'tomorrow') {
        now.setDate(now.getDate() + 1);
      }
      now.setHours(12, 0, 0, 0); // Set to noon
      newTimestamp = now.getTime();
    }

    setEditedTask(prev => ({
      ...prev,
      dueDate: newTimestamp
    }));
  };

  const setDateFromCalendar = (date) => {
    const selectedDate = new Date(date);
    selectedDate.setHours(12, 0, 0, 0);
    setEditedTask(prev => ({
      ...prev,
      dueDate: selectedDate.getTime()
    }));
  };

  const addTag = () => {
    if (newTag.trim()) {
      setEditedTask(prev => ({
        ...prev,
        tags: [...new Set([...prev.tags, newTag.trim()])]
      }));
      setNewTag('');
    }
  };

  const addLink = () => {
    if (newLink.trim()) {
      setEditedTask(prev => ({
        ...prev,
        links: [...prev.links, { url: newLink.trim() }]
      }));
      setNewLink('');
    }
  };

  const removeLink = (url) => {
    setEditedTask(prev => ({
      ...prev,
      links: prev.links.filter(link => link.url !== url)
    }));
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'No date set';
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
      dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }
    return dateStr;
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      className="w-[32rem] max-w-[calc(100vw-2rem)]"
    >
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            Add Task
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Task Text */}
          <input
            type="text"
            value={editedTask.text}
            onChange={e => setEditedTask(prev => ({ ...prev, text: e.target.value }))}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
            placeholder="What needs to be done?"
            autoFocus
          />

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('date')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 
                       hover:bg-gray-700 rounded-lg border border-gray-700"
            >
              <CalendarIcon className="w-5 h-5" />
              <span>{formatDateTime(editedTask.dueDate)}</span>
            </button>
            <select
              value={editedTask.priority}
              onChange={e => setEditedTask(prev => ({ ...prev, priority: e.target.value }))}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Date Picker Panel */}
          {activeTab === 'date' && (
            <div className="space-y-4 pt-2">
              <Calendar 
                selected={editedTask.dueDate ? new Date(editedTask.dueDate) : null}
                onSelect={(date) => {
                  setDateFromCalendar(date);
                  setActiveTab('main');
                }}
              />

              <button 
                onClick={() => {
                  handleQuickDateSet('remove');
                  setActiveTab('main');
                }}
                className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 
                         rounded-lg text-sm font-medium border border-red-500/20"
              >
                Remove Date
              </button>
            </div>
          )}

          {/* Main Tab Content */}
          {activeTab === 'main' && (
            <>
              {/* Tags Section */}
              <div className="space-y-4">
                <label className="block text-sm text-gray-400">Tags</label>
                {/* Selected Tags */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {editedTask.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-blue-500 text-white rounded-full text-sm">
                      {tag}
                      <button
                        onClick={() => setEditedTask(prev => ({
                          ...prev,
                          tags: prev.tags.filter(t => t !== tag)
                        }))}
                        className="ml-2 hover:text-white/75"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {/* Available Tags */}
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {availableTags
                      .filter(tag => !editedTask.tags.includes(tag))
                      .map(tag => (
                        <button
                          key={tag}
                          onClick={() => setEditedTask(prev => ({
                            ...prev,
                            tags: [...prev.tags, tag]
                          }))}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 
                                   rounded-full text-sm transition-colors"
                        >
                          + {tag}
                        </button>
                    ))}
                  </div>
                )}
                {/* New Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addTag()}
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                    placeholder="Add a new tag..."
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Links Section */}
              <div className="space-y-4">
                <label className="block text-sm text-gray-400">Links</label>
                {/* Existing Links */}
                <div className="space-y-2">
                  {editedTask.links.map(link => (
                    <div key={link.url} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                      <span className="flex-1 text-blue-400 text-sm truncate">{link.url}</span>
                      <button
                        onClick={() => removeLink(link.url)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {/* New Link Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLink}
                    onChange={e => setNewLink(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addLink()}
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                    placeholder="Add a link..."
                  />
                  <button
                    onClick={addLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <label className="block text-sm text-gray-400">Color</label>
                <CirclePicker
                  color={editedTask.color}
                  onChange={color => setEditedTask(prev => ({ ...prev, color: color.hex }))}
                  width="100%"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-sm text-gray-400">Notes</label>
                <textarea
                  value={editedTask.notes}
                  onChange={e => setEditedTask(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                  placeholder="Add some notes..."
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedTask)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
