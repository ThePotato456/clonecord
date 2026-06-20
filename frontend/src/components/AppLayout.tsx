import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserHeader from './UserHeader';
import ChannelList from './ChannelList';

interface AppLayoutProps {
  children?: React.ReactNode;
}

interface User {
  id: string;
  username: string;
  status?: string;
  channels?: string[];
}

interface Channel {
  id: string;
  name: string;
  type?: string;
  topic?: string;
}

function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      navigate('/auth');
      return;
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
      }
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const fetchChannels = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch channels');
        }

        const data = (await res.json()) as Array<Channel | Record<string, unknown>>;
        const normalized = data
          .map((item) => {
            if ('id' in item && 'name' in item) {
              return {
                id: String(item.id),
                name: String(item.name),
                type: item.type ? String(item.type) : 'text',
                topic: item.topic ? String(item.topic) : undefined,
              } as Channel;
            }
            return null;
          })
          .filter((item): item is Channel => Boolean(item));

        setChannels(normalized);
      } catch (error) {
        console.error('Failed to fetch channels:', error);
        setChannels([]);
      }
    };

    void fetchChannels();
  }, []);

  useEffect(() => {
    const parts = location.pathname.split('/');
    if (parts[1] === 'channel' && parts[2]) {
      setSelectedChannel(parts[2]);
    }
  }, [location.pathname]);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannel(channelId);
    navigate(`/channel/${channelId}`);
  };

  const safeChildren = useMemo(() => children ?? <div className="flex-1" />, [children]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-discord-bg text-discord-text">
        <p>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-discord-bg text-discord-text">
      <aside className="w-24 flex-shrink-0 border-r border-gray-700 bg-discord-sidebar p-3">
        <UserHeader user={user} />
      </aside>

      <aside className="w-64 flex-shrink-0 border-r border-gray-700 bg-discord-sidebar">
        <ChannelList channels={channels} selectedChannel={selectedChannel} onSelect={handleChannelSelect} />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">{safeChildren}</main>
    </div>
  );
}

export default AppLayout;
