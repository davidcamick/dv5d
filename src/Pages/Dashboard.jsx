import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuroraText } from '../components/ui/AuroraText';
import { AnimatedGridPattern } from '../components/ui/AnimatedGridPattern';
import QuickLinksPanel from '../components/dashboard/QuickLinksPanel';
import TasksPanel from '../components/dashboard/TasksPanel';
import PasswordPanel from '../components/dashboard/PasswordPanel';
import InfoPanel from '../components/dashboard/InfoPanel';

export default function Dashboard() {
  useEffect(() => {
    document.title = 'dv5d Dashboard';
  }, []);

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
        <div className="mb-8">
          <AuroraText as="h1" className="text-3xl font-bold">
            Welcome, Sir Camick
          </AuroraText>
        </div>

        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
          <QuickLinksPanel />
          <TasksPanel />
          <PasswordPanel />
          <InfoPanel />
        </div>
      </div>
    </div>
  );
}
