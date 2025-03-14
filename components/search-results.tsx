"use client";

import { Plus } from "lucide-react";

interface SearchResultsProps {
  video: {
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails: {
        default: {
          url: string;
        };
      };
    };
  };
  onAdd: () => void;
}

export function SearchResults({ video, onAdd }: SearchResultsProps) {
  return (
    <div
      className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 w-[375px]"
    >
      <img
        src={video.snippet.thumbnails.default.url || "/placeholder.svg"}
        alt={video.snippet.title}
        className="object-cover w-12 h-12 rounded"
      />
      <div className="flex-1 min-w-0 overflow-clip">
        <h4 className="text-sm font-medium truncate">{video.snippet.title}</h4>
        <p className="text-xs text-gray-400 truncate">
          {video.snippet.channelTitle}
        </p>
      </div>
      <button
        onClick={onAdd}
        className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
