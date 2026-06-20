import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Server {
  id: string;
  defaultChannelId?: string;
}

function RootRedirect() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Loading your servers...');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/auth', { replace: true });
      return;
    }

    const boot = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/servers`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to load servers');
        }

        const servers = (await response.json()) as Server[];
        if (servers.length === 0) {
          setMessage('No servers yet. Create one after logging in again.');
          return;
        }

        const target = servers[0];
        navigate(`/server/${target.id}/channel/${target.defaultChannelId || 'general'}`, { replace: true });
      } catch (error) {
        console.error(error);
        setMessage('Unable to load servers right now.');
      }
    };

    void boot();
  }, [navigate]);

  return <div className="flex min-h-screen items-center justify-center bg-discord-bg text-discord-text">{message}</div>;
}

export default RootRedirect;
