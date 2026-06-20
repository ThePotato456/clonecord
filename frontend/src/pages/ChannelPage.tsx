import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  editedAt?: string | null;
}

interface ChannelData {
  id: string;
  name: string;
  topic?: string;
}

const socket: Socket = io(process.env.REACT_APP_API_URL || 'http://localhost:4000', {
  autoConnect: false,
  auth: { token: localStorage.getItem('auth_token') },
});

function ChannelPage() {
  const { id } = useParams<{ id: string }>();
  const channelId = id ?? 'general';
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('channel:join', { channelId });

    const onMessageCreated = (message: Message) => {
      if (message.channelId === channelId) {
        setMessages((current) => [...current, message]);
      }
    };

    const onTyping = ({ username }: { username: string }) => {
      setTypingUsers((current) => (current.includes(username) ? current : [...current, username]));
    };

    const onStoppedTyping = ({ userId }: { userId: string }) => {
      setTypingUsers((current) => current.filter((name) => name !== userId));
    };

    socket.on('message:created', onMessageCreated);
    socket.on('typing:user_typing', onTyping);
    socket.on('typing:user_stopped', onStoppedTyping);

    return () => {
      socket.emit('channel:leave', { channelId });
      socket.off('message:created', onMessageCreated);
      socket.off('typing:user_typing', onTyping);
      socket.off('typing:user_stopped', onStoppedTyping);
    };
  }, [channelId]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const loadChannel = async () => {
      try {
        const [channelRes, messagesRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/channels/${channelId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/messages/channel/${channelId}?limit=50`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const channelJson = await channelRes.json();
        const messagesJson = await messagesRes.json();

        if (channelRes.ok) {
          setChannelData({
            id: String(channelJson.id ?? channelId),
            name: String(channelJson.name ?? channelId),
            topic: channelJson.topic ? String(channelJson.topic) : undefined,
          });
        } else {
          setChannelData({ id: channelId, name: channelId });
        }

        setMessages(Array.isArray(messagesJson) ? (messagesJson as Message[]) : []);
      } catch (error) {
        console.error('Failed to load channel page:', error);
        setChannelData({ id: channelId, name: channelId });
        setMessages([]);
      }
    };

    void loadChannel();
  }, [channelId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      socket.emit('typing:start', { channelId });

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelId, content: newMessage.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const created = (await response.json()) as Message;
      setMessages((current) => [...current, created]);
      socket.emit('typing:end', { channelId });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return '';
    const display = typingUsers.slice(0, 3).join(', ');
    return `${display} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`;
  }, [typingUsers]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-gray-700 bg-discord-sidebar px-4 py-3">
        <h1 className="text-lg font-semibold"># {channelData?.name ?? channelId}</h1>
        {channelData?.topic ? <p className="text-sm text-discord-muted">{channelData.topic}</p> : null}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center italic text-discord-muted">No messages yet. Start the channel.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex items-start gap-3 rounded px-2 py-1 hover:bg-discord-hover">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 font-bold text-white">
                {message.username?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{message.username}</span>
                  <span className="text-xs text-discord-muted">{new Date(message.timestamp).toLocaleString()}</span>
                </div>
                <p className="break-words text-sm text-discord-text">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {typingText ? (
        <div className="border-t border-gray-700 bg-discord-sidebar px-4 py-2 text-sm text-discord-muted">{typingText}</div>
      ) : null}

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
            placeholder={`Message #${channelData?.name ?? channelId}`}
            className="flex-1 rounded border border-gray-600 bg-discord-bg px-4 py-2 outline-none focus:border-discord-accent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="rounded bg-green-600 px-4 py-2 font-medium transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChannelPage;
