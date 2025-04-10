"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type AudioStream = MediaStream | null;
type AudioContextType = {
  localStream: AudioStream;
  remoteStreams: Map<string, AudioStream>;
  isMuted: boolean;
  startLocalStream: () => Promise<MediaStream | void>;
  stopLocalStream: () => void;
  toggleMute: () => void;
  addRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
};

const defaultAudioContext: AudioContextType = {
  localStream: null,
  remoteStreams: new Map(),
  isMuted: false,
  startLocalStream: async () => {},
  stopLocalStream: () => {},
  toggleMute: () => {},
  addRemoteStream: () => {},
  removeRemoteStream: () => {},
};

const AudioContext = createContext<AudioContextType>(defaultAudioContext);

export const useAudioContext = () => useContext(AudioContext);

export function AudioContextProvider({ children }: { children: ReactNode }) {
  const [localStream, setLocalStream] = useState<AudioStream>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, AudioStream>>(
    new Map()
  );
  const [isMuted, setIsMuted] = useState(false);

  const startLocalStream = async () => {
    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false,
      });
      
      console.log("Microphone access granted.");
      console.log(`Got audio stream with ${stream.getAudioTracks().length} audio tracks`);
      
      stream.getAudioTracks().forEach(track => {
        console.log(`Audio track: ${track.label}, enabled: ${track.enabled}, muted: ${track.muted}`);
      });
      
      setLocalStream(stream);
      
      // Initially set audio to unmuted
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      
      return stream;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const addRemoteStream = (userId: string, stream: MediaStream) => {
    setRemoteStreams((prev) => {
      const newStreams = new Map(prev);
      newStreams.set(userId, stream);
      return newStreams;
    });
  };

  const removeRemoteStream = (userId: string) => {
    setRemoteStreams((prev) => {
      const newStreams = new Map(prev);
      const stream = newStreams.get(userId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        newStreams.delete(userId);
      }
      return newStreams;
    });
  };

  return (
    <AudioContext.Provider
      value={{
        localStream,
        remoteStreams,
        isMuted,
        startLocalStream,
        stopLocalStream,
        toggleMute,
        addRemoteStream,
        removeRemoteStream,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
} 