import React, { useEffect, useState } from 'react';

interface Channel {
  id: string;
  serverId: string;
  name: string;
  type?: string;
  topic?: string;
}

interface ChannelListProps {
  serverName: string;
  serverId: string | null;
  channels: Channel[];
  selectedChannel: string | null;
  onSelect: (channelId: string) => void;
  onChannelCreated: (channel: Channel) => void;
}

function ChannelList({
  serverName,
  serverId,
  channels,
  selectedChannel,
  onSelect,
  onChannelCreated,
}: ChannelListProps) {
  const [channelItems, setChannelItems] = useState<Channel[]>(channels);
  const [isCreating, setIsCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  useEffect(() => {
    setChannelItems(channels);
  }, [channels]);

  const handleCreateChannel = async () => {
    if (!serverId || !newChannelName.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/servers/${serverId}/channels`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newChannelName.trim() }),
        }
      );

      const channel = (await response.json()) as Channel & { error?: string };
      if (!response.ok) {
        throw new Error(channel.error || 'Failed to create channel');
      }

      setNewChannelName('');
      setIsCreating(false);
      setChannelItems((current) => [...current, channel]);
      onChannelCreated(channel);
      onSelect(channel.id);
    } catch (error) {
      console.error('Failed to create channel:', error);
      window.alert('Could not create channel');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-700 px-4 py-3">
        <h2 className="truncate text-sm font-semibold text-white">{serverName}</h2>
        <p className="text-xs uppercase tracking-wide text-discord-muted">Text Channels</p>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {channelItems.length === 0 ? (
          <p className="px-3 py-2 text-sm italic text-discord-muted">No channels yet</p>
        ) : (
          channelItems.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelect(channel.id)}
              className={`flex w-full items-center rounded px-3 py-2 text-left text-sm transition-colors ${
                selectedChannel === channel.id ? 'bg-discord-accent text-white' : 'hover:bg-discord-hover'
              }`}
            >
              <span className="mr-2 text-discord-muted">#</span>
              <span className="truncate">{channel.name}</span>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-gray-700 p-2">
        {!isCreating ? (
          <button
            type="button"
            disabled={!serverId}
            onClick={() => setIsCreating(true)}
            className="w-full rounded bg-discord-accent px-3 py-2 text-sm font-medium transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Create Channel
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateChannel();
            }}
            className="space-y-2"
          >
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Channel name"
              className="w-full rounded border border-gray-600 bg-discord-bg px-3 py-2 text-sm outline-none focus:border-discord-accent"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded bg-green-600 px-3 py-2 text-sm font-medium hover:bg-green-500">
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewChannelName('');
                }}
                className="rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChannelList;
