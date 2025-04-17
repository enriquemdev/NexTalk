// /pages/api/start-transcription.ts
import { EgressClient, EncodedFileType, RoomCompositeOptions } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { roomId } = await req.json();

  if (!roomId) {
    return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
  }

  const livekitHost = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitHost || !apiKey || !apiSecret) {
    console.error('LiveKit configuration is missing in environment variables.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const egressClient = new EgressClient(livekitHost, apiKey, apiSecret);

  // Define the output configuration for the composite file (required for transcription)
  const fileOutput = {
    filepath: `transcripts/${roomId}.mp4`, // Base filepath for outputs
    fileType: EncodedFileType.MP4,       // Must be MP4 or MP3 for transcription
    disableManifest: true,
  };

  // Define the options for the egress, including transcription settings
  const egressOptions: RoomCompositeOptions = {
    audioOnly: true, // Record only audio
    // Enable transcription and specify its output format
    transcription: {
      filename: `transcripts/${roomId}.txt`, // Output path relative to filepath base
      outputFormat: 'txt',
      // language: 'en-US',
    },
    // layout: 'speaker', // Optional: specify layout if needed
  };

  try {
    console.log(`Starting egress with transcription for room: ${roomId}`);
    // Call with separate output and options arguments
    const egressInfo = await egressClient.startRoomCompositeEgress(roomId, fileOutput, egressOptions);
    console.log(`Egress started successfully for room: ${roomId}, egressId: ${egressInfo.egressId}`);

    // Return the egressId so it can be stored and tracked
    return NextResponse.json({ success: true, egressId: egressInfo.egressId });

  } catch (error) {
    console.error(`Failed to start egress for room ${roomId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error starting transcription';
    return NextResponse.json({ success: false, error: `Failed to start transcription: ${errorMessage}` }, { status: 500 });
  }
}
