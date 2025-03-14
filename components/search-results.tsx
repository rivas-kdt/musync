"use client"

interface SearchResultsProps {
  video: {
    id: {
      videoId: string
    }
    snippet: {
      title: string
      channelTitle: string
      thumbnails: {
        default: {
          url: string
        }
      }
    }
  }
  onAdd: () => void
}

export function SearchResults({ video, onAdd }: SearchResultsProps) {
  return (
    <div className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-md w-[375px]">
      <img
        src={video.snippet.thumbnails.default.url || "/placeholder.svg"}
        alt={video.snippet.title}
        className="w-12 h-12 rounded object-cover"
      />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{video.snippet.title}</h4>
        <p className="text-xs text-gray-400 truncate">{video.snippet.channelTitle}</p>
      </div>
      <button onClick={onAdd} className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded">
        Add
      </button>
    </div>
  )
}

