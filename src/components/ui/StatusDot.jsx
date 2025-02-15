export default function StatusDot({ status }) {
  if (!status) return null;

  return (
    <div 
      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
        status === 'pending' 
          ? 'bg-orange-500 animate-pulse' 
          : status === 'synced'
            ? 'bg-green-500'
            : 'bg-transparent'
      }`}
      title={status === 'pending' ? 'Waiting for backup...' : 'Backed up'}
    />
  );
}
