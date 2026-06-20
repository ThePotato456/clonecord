import React from 'react';

interface Server {
  id: string;
  name: string;
  iconText?: string;
  defaultChannelId?: string;
}

interface ServerListProps {
  servers: Server[];
  selectedServerId: string | null;
  onSelect: (serverId: string) => void;
  onCreate: () => void;
}

function ServerList({ servers, selectedServerId, onSelect, onCreate }: ServerListProps) {
  return (
    <div className="flex h-full flex-col items-center gap-3 bg-[#1e1f22] px-3 py-4">
      {servers.map((server) => {
        const active = selectedServerId === server.id;
        const label = server.iconText || server.name.charAt(0).toUpperCase();
        return (
          <button
            key={server.id}
            type="button"
            title={server.name}
            onClick={() => onSelect(server.id)}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl font-bold text-white transition-all ${
              active ? 'bg-discord-accent rounded-xl' : 'bg-discord-sidebar hover:bg-discord-accent hover:rounded-xl'
            }`}
          >
            {label.slice(0, 2).toUpperCase()}
          </button>
        );
      })}

      <button
        type="button"
        onClick={onCreate}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2b2d31] text-2xl text-green-400 transition-all hover:rounded-xl hover:bg-green-600 hover:text-white"
        title="Create server"
      >
        +
      </button>
    </div>
  );
}

export default ServerList;
