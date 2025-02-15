import { useState, useEffect } from 'react';
import { AuroraText } from '../ui/AuroraText';

export default function InfoPanel() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gray-800/70 rounded-xl p-6 backdrop-blur-sm shadow-lg border border-gray-700/50">
      <AuroraText as="h2" className="text-xl font-semibold mb-4">
        Info
      </AuroraText>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm text-gray-400 mb-1">Time</h3>
          <div className="text-2xl font-mono text-white">
            {time.toLocaleTimeString()}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm text-gray-400 mb-1">Date</h3>
          <div className="text-xl text-white">
            {time.toLocaleDateString(undefined, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
