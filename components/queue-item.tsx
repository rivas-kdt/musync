interface QueueItemProps {
  song: {
    videoId: string
    title: string
    thumbnail: string
    channelTitle: string
    addedByName: string
  }
  position: number
}

export function QueueItem({ song, position }: QueueItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-4 text-center text-gray-400 font-medium">{position}</div>
      <img src={song.thumbnail || "/placeholder.svg"} alt={song.title} className="w-12 h-12 rounded object-cover" />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{song.title}</h4>
        <p className="text-xs text-gray-400 truncate">{song.channelTitle}</p>
        <p className="text-xs text-gray-400 truncate">Added by {song.addedByName}</p>
      </div>
    </div>
  )
}

