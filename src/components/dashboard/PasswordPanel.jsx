import { AuroraText } from '../ui/AuroraText';
import { Link } from 'react-router-dom';
import { Cog6ToothIcon as SettingsIcon } from '@heroicons/react/24/outline';

export default function PasswordPanel() {
  return (
    <div className="bg-gray-800/70 rounded-xl p-6 backdrop-blur-sm shadow-lg border border-gray-700/50">
      <div className="flex justify-between items-center mb-4">
        <AuroraText as="h2" className="text-xl font-semibold">
          Password Manager
        </AuroraText>
        <Link
          to="/passwords"
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-all"
        >
          <SettingsIcon className="w-5 h-5" />
        </Link>
      </div>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search passwords..."
          className="w-full px-4 py-2 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <h3 className="text-sm text-gray-400 mb-2">Frequently Used</h3>
        <div className="space-y-2">
          {/* Placeholder items */}
          {[1, 2, 3].map(i => (
            <div key={i} className="p-3 bg-gray-700/50 rounded-lg animate-pulse">
              <div className="h-4 w-3/4 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
