export default function StatusDot({ status }) {
  return (
    <div 
      className={`w-2 h-2 rounded-full ${
        status === 'pending' ? 'bg-yellow-500 animate-pulse' :
        status === 'synced' ? 'bg-green-500' :
        'bg-gray-500'
      }`}
    />
  );
}
