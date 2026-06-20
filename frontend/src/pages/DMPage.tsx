import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { connectSocket } from '../lib/socket';

interface User {
  id: string;
  username: string;
  avatarUrl?: string | null;
  status: string;
}

interface DirectMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp?: string;
}

function DMPage() {
  const { userId } = useParams<{ userId: string }>();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const socket = connectSocket(token);
    const onDmMessage = (message: DirectMessage & { recipientId?: string }) => {
      if (selectedUser && (message.userId === selectedUser.id || message.recipientId === selectedUser.id)) {
        setMessages((current) => (current.some((entry) => entry.id === message.id) ? current : [...current, message]));
      }
    };

    socket.on('dm:message', onDmMessage);
    return () => {
      socket.off('dm:message', onDmMessage);
    };
  }, [selectedUser]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const loadUsers = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/users/online`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? (data as User[]) : [];
        setUsers(list);

        if (userId) {
          const initial = list.find((user) => user.id === userId) ?? null;
          setSelectedUser(initial);
        }
      } catch (error) {
        console.error('Failed to fetch online users:', error);
        setUsers([]);
      }
    };

    void loadUsers();
  }, [userId]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token || !selectedUser) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/messages/user/${selectedUser.id}?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMessages(Array.isArray(data) ? (data as DirectMessage[]) : []);
      } catch (error) {
        console.error('Failed to load direct messages:', error);
        setMessages([]);
      }
    };

    void loadMessages();
  }, [selectedUser]);

  const handleSendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientId: selectedUser.id, content: newMessage.trim() }),
      });

      const created = await response.json();
      if (!response.ok) {
        throw new Error(created.error || 'Failed to send DM');
      }

      setMessages((current) => (current.some((entry) => entry.id === created.id) ? current : [...current, created]));
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send direct message:', error);
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-700 bg-discord-sidebar">
        <div className="border-b border-gray-700 px-4 py-3">
          <h1 className="text-lg font-semibold">Direct Messages</h1>
        </div>

        <div className="space-y-1 p-2">
          {users.length === 0 ? (
            <p className="px-3 py-2 text-sm italic text-discord-muted">No online users</p>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUser(user)}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors ${
                  selectedUser?.id === user.id ? 'bg-discord-accent text-white' : 'hover:bg-discord-hover'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{user.username}</p>
                  <p className="text-xs capitalize text-discord-muted">{user.status}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-gray-700 bg-discord-sidebar px-4 py-3">
          <h2 className="text-lg font-semibold">
            {selectedUser ? `Chat with ${selectedUser.username}` : 'Select a user to start chatting'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!selectedUser ? (
            <p className="mt-8 text-center italic text-discord-muted">Choose someone from the sidebar to open a DM.</p>
          ) : messages.length === 0 ? (
            <p className="mt-8 text-center italic text-discord-muted">No messages yet. Say hello.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="rounded px-3 py-2 hover:bg-discord-hover">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{message.username}</span>
                    {message.timestamp ? (
                      <span className="text-xs text-discord-muted">{new Date(message.timestamp).toLocaleString()}</span>
                    ) : null}
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 bg-discord-sidebar px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!selectedUser}
              placeholder={selectedUser ? `Message ${selectedUser.username}` : 'Select a user first'}
              className="flex-1 rounded border border-gray-600 bg-discord-bg px-4 py-2 outline-none focus:border-discord-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!selectedUser || !newMessage.trim()}
              className="rounded bg-green-600 px-4 py-2 font-medium transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DMPage;
