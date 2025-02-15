import { Link } from 'react-router-dom';
import { AuroraText } from '../components/ui/AuroraText';
import { AnimatedGridPattern } from '../components/ui/AnimatedGridPattern';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function Passwords() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 relative overflow-hidden">
      <AnimatedGridPattern 
        className="absolute inset-0 z-0 opacity-30"
        width={32}
        height={32}
        numSquares={75}
        maxOpacity={0.1}
        duration={3}
      />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-all"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <AuroraText as="h1" className="text-3xl font-bold">
            Password Manager
          </AuroraText>
        </div>

        <div className="bg-gray-800/70 rounded-xl p-6 backdrop-blur-sm shadow-lg border border-gray-700/50">
          {/* Password management UI will go here */}
          <div className="text-center text-gray-400 py-8">
            Password management coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}
