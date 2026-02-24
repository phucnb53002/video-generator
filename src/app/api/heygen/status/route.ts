import { NextResponse } from 'next/server';
import { getVideoStatus } from '@/lib/heygen';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const status = await getVideoStatus(videoId);
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get video status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
