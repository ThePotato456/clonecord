import React, { useState } from 'react';

interface UserHeaderProps {
  user: {
    id: string;
    username: string;
    status?: string;
  };
}

const statusOptions = [
  { value: 'online', label: 'Online' },
  { value: 'idle', label: 'Idle' },
  { value: 'dnd', label: 'Do Not Disturb' },
  { value: 'offline', label: 'Offline' },
];

function UserHeader({ user }: UserHeaderProps) {
  const [status, setStatus] = useState(user.status || 'online');
  const [isEditing, setIsEditing] = useState(false);

  const handleStatusChange = async (nextStatus: string) => {
    try {
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      setStatus(nextStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 font-bold text-white ring-2 ${
          status === 'online'
            ? 'ring-green-500'
            : status === 'idle'
            ? 'ring-yellow-500'
            : status === 'dnd'
            ? 'ring-red-500'
            : 'ring-gray-500'
        }`}
      >
        {user.username?.charAt(0).toUpperCase() || '?'}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-discord-text">{user.username}</p>
        {isEditing ? (
          <select
            value={status}
            onChange={(e) => void handleStatusChange(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded border border-gray-600 bg-discord-bg px-2 py-1 text-sm outline-none focus:border-discord-accent"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <button type="button" onClick={() => setIsEditing(true)} className="text-xs capitalize text-discord-muted hover:text-white">
            {status}
          </button>
        )}
      </div>
    </div>
  );
}

export default UserHeader;
