'use client';

import { useState, useEffect } from 'react';
import { PageClientImpl } from './page-client';
import '@livekit/components-styles';

// Main video room component
export default function VideoRoom(props: {
  params: { roomName: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { params, searchParams } = props;
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Properly decode the room name from URL
  const roomName = params?.roomName ? decodeURIComponent(params.roomName) : '';
  
  // Validate room name
  useEffect(() => {
    console.log("Rendering video room with name:", roomName);
    
    if (!roomName || roomName === 'undefined' || roomName === 'null') {
      setError('Invalid room name. Please go back and try creating a new room.');
      setIsLoading(false);
      return;
    }
  }, [roomName]);
  
  // Process parameters
  const region = typeof searchParams.region === 'string' ? searchParams.region : undefined;
  
  // Parse hq parameter
  const hq = searchParams.hq !== 'false';
  
  // Parse codec parameter
  let codec: 'vp8' | 'vp9' | 'h264' | 'av1' = 'vp9';
  if (typeof searchParams.codec === 'string') {
    if (['vp8', 'h264', 'av1'].includes(searchParams.codec)) {
      codec = searchParams.codec as 'vp8' | 'h264' | 'av1';
    }
  }

  // Check for LiveKit server configuration
  useEffect(() => {
    if (error) return; // Skip if there's already an error
    
    setIsLoading(true);
    // Add a simple check to ensure environment is properly configured
    fetch('/api/connection-details?check=true')
      .then(response => {
        if (!response.ok) {
          throw new Error('LiveKit server configuration issue');
        }
        return response.json();
      })
      .then(() => {
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error checking LiveKit configuration:', err);
        setError('Could not connect to video service. Please try again later.');
        setIsLoading(false);
      });
  }, [error]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-medium">Connecting to video room...</h2>
          <p className="text-gray-400 mt-2">Setting up your connection</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        <div className="text-center p-4 max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-medium mb-2">Connection Error</h2>
          <p className="mb-4">{error}</p>
          <div className="flex space-x-4 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <PageClientImpl
        roomName={roomName}
        region={region}
        hq={hq}
        codec={codec}
      />
    </div>
  );
} 