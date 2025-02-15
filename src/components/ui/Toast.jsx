import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500'
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 ${styles[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn`}>
      {message}
    </div>
  );
}
