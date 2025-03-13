import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  const apiKey = "AIzaSyA_paVu0TigV4d_z-D0-fGiNrlHbPrar4M"

  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key is not configured" }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(
        query,
      )}&type=video&key=${apiKey}`,
    )

    if (!response.ok) {
      throw new Error(`YouTube API responded with status ${response.status}`)
    }

    const data = await response.json()

    // Transform the YouTube API response to match our expected format
    const transformedResults = data.items.map((item: any) => ({
      id: { videoId: item.id.videoId },
      snippet: {
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnails: {
          default: item.snippet.thumbnails.default,
        },
      },
    }))

    return NextResponse.json({ items: transformedResults })
  } catch (error) {
    console.error("Error fetching from YouTube API:", error)
    return NextResponse.json({ error: "Failed to fetch results from YouTube" }, { status: 500 })
  }
}

