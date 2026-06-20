import React, { useState } from 'react';

interface UserHeaderProps {
  user: any;
}

const statusOptions = [
  { value: 'online', label: 'Online', color: '#3ba55c' },
  { value: 'idle', label: 'Idle', color: '#faa61a' },
  { value: 'dnd', label: 'Do Not Disturb', color: '#da373c' },
  { value: 'offline', label: 'Offline', color: '#72767d' },
];

function UserHeader({ user }: UserHeaderProps) {
  const [status, setStatus] = useState(user.status || 'online');
  const [isEditing, setIsEditing] = useState(false);

  const handleStatusChange = async () => {
    try {
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center py-4">
      {/* Avatar */}
      <div className="relative group cursor-pointer">
        <div 
          className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg border-2 ${
            status === 'online' ? 'border-green-500' : 
            status === 'idle' ? 'border-yellow-500' : 
            status === 'dnd' ? 'border-red-500' : 'border-gray-500'
          }`}
        >
          {user.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-discord-sidebar ${
          status === 'online' ? 'bg-green-500' : 
          status === 'idle' ? 'bg-yellow-500' : 
          status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
        }`} />
      </div>

      {/* Username and Status */}
      <div className="mt-2 text-center">
        <p className="font-medium text-discord-text truncate max-w-[120px]">{user.username}</p>
        {isEditing ? (
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            onBlur={handleStatusChange}
            autoFocus
            className="mt-1 px-2 py-1 text-sm bg-discord-bg rounded border border-gray-600 focus:border-discord-accent outline-none"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-discord-muted capitalize">{user.status || 'online'}</p>
        )}
      </div>

      {/* Edit Status Button */}
      {!isEditing && (
        <button 
          onClick={() => setIsEditing(true)}
          className="mt-2 px-3 py-1 text-xs bg-discord-accent hover:bg-purple-600 rounded-full transition-colors"
        >
          Change Status
        </button>
      )}
    </div>
  );
}

export default UserHeader;
