import { AuroraText } from '../ui/AuroraText';

export default function QuickLinksPanel() {
  const links = [
    { name: 'Gmail', url: 'https://mail.google.com' },
    { name: 'Instagram', url: 'https://instagram.com' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'ChatGPT', url: 'https://chat.openai.com' },
    { name: 'Netflix', url: 'https://netflix.com' },
    { name: 'YouTube', url: 'https://youtube.com' },
    { name: 'Canvas', url: 'https://stpius.instructure.com' },
    { name: 'myBama', url: 'https://mybama.ua.edu' },
  ];

  return (
    <div className="bg-gray-800/70 rounded-xl p-6 backdrop-blur-sm shadow-lg border border-gray-700/50">
      <AuroraText as="h2" className="text-xl font-semibold mb-4">
        Quick Links
      </AuroraText>
      <div className="grid grid-cols-2 gap-4">
        {links.map(link => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-700/80 hover:bg-gray-700 text-white p-4 rounded-lg 
                     flex items-center justify-center font-medium transition-all
                     hover:scale-105"
          >
            {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}
