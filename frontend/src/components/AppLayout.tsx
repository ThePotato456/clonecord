import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ChannelList from './ChannelList';
import ServerList from './ServerList';
import UserHeader from './UserHeader';
import { connectSocket } from '../lib/socket';

interface AppLayoutProps {
  children?: React.ReactNode;
}

interface User {
  id: string;
  username: string;
  status?: string;
  serverIds?: string[];
  channels?: string[];
}

interface ServerItem {
  id: string;
  name: string;
  iconText?: string;
  defaultChannelId?: string;
}

interface Channel {
  id: string;
  serverId: string;
  name: string;
  type?: string;
  topic?: string;
}

function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      navigate('/auth');
      return;
    }

    connectSocket(token);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
      }
    }

    const bootstrap = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to load user');
        }

        const currentUser = (await response.json()) as User;
        localStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem('user_id', currentUser.id);
        setUser(currentUser);
      } catch (error) {
        console.error(error);
        navigate('/auth');
      }
    };

    void bootstrap();
  }, [navigate]);

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const serverIndex = pathParts.indexOf('server');
    const channelIndex = pathParts.indexOf('channel');

    setSelectedServerId(serverIndex >= 0 ? pathParts[serverIndex + 1] || null : null);
    setSelectedChannelId(channelIndex >= 0 ? pathParts[channelIndex + 1] || null : null);
  }, [location.pathname, params]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const loadServers = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/servers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch servers');
        }

        const serverList = (await response.json()) as ServerItem[];
        setServers(serverList);
      } catch (error) {
        console.error('Failed to fetch servers:', error);
        setServers([]);
      }
    };

    void loadServers();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token || !selectedServerId) {
      setChannels([]);
      return;
    }

    const socket = connectSocket(token);
    socket.emit('server:join', { serverId: selectedServerId });

    const loadChannels = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/servers/${selectedServerId}/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch channels');
        }

        const channelList = (await response.json()) as Channel[];
        setChannels(channelList);

        if (!selectedChannelId && channelList[0]) {
          navigate(`/server/${selectedServerId}/channel/${channelList[0].id}`);
        }
      } catch (error) {
        console.error('Failed to fetch channels:', error);
        setChannels([]);
      }
    };

    const handleChannelCreated = (channel: Channel) => {
      if (channel.serverId !== selectedServerId) return;
      setChannels((current) => (current.some((item) => item.id === channel.id) ? current : [...current, channel]));
    };

    socket.on('channel:created', handleChannelCreated);
    void loadChannels();

    return () => {
      socket.emit('server:leave', { serverId: selectedServerId });
      socket.off('channel:created', handleChannelCreated);
    };
  }, [navigate, selectedChannelId, selectedServerId]);

  const handleServerSelect = (serverId: string) => {
    const server = servers.find((item) => item.id === serverId);
    const fallbackChannel = server?.defaultChannelId || channels[0]?.id || 'general';
    navigate(`/server/${serverId}/channel/${fallbackChannel}`);
  };

  const handleChannelSelect = (channelId: string) => {
    if (!selectedServerId) return;
    navigate(`/server/${selectedServerId}/channel/${channelId}`);
  };

  const handleServerCreate = async () => {
    const name = window.prompt('Server name');
    if (!name?.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/servers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create server');
      }

      setServers((current) => [...current, payload.server]);
      navigate(`/server/${payload.server.id}/channel/${payload.defaultChannel.id}`);
    } catch (error) {
      console.error(error);
      window.alert('Could not create server');
    }
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
      <aside className="w-20 flex-shrink-0 border-r border-gray-800 bg-[#1e1f22]">
        <ServerList
          servers={servers}
          selectedServerId={selectedServerId}
          onSelect={handleServerSelect}
          onCreate={handleServerCreate}
        />
      </aside>

      <aside className="flex w-72 flex-shrink-0 flex-col border-r border-gray-700 bg-discord-sidebar">
        <div className="flex-1 overflow-hidden">
          <ChannelList
            serverName={servers.find((server) => server.id === selectedServerId)?.name || 'Channels'}
            serverId={selectedServerId}
            channels={channels}
            selectedChannel={selectedChannelId}
            onSelect={handleChannelSelect}
            onChannelCreated={(channel) => setChannels((current) => [...current, channel])}
          />
        </div>
        <div className="border-t border-gray-700">
          <UserHeader user={user} />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">{safeChildren}</main>
    </div>
  );
}

export default AppLayout;
