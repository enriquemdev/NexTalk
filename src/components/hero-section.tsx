import React from 'react';
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="text-center px-4 py-12 sm:py-16 bg-gradient-to-b from-background to-muted/50 rounded-lg">
      <h1 className="text-3xl sm:text-4xl font-bold mb-4">Welcome to NexTalk</h1>
      <p className="text-lg text-muted-foreground mb-3">A space for live video and chat conversations.</p>
      <p className="text-sm text-muted-foreground mb-6">Explore rooms below. Sign in to create a room or join with a private access code.</p>
      <Button asChild><a href="#video-rooms">Explore rooms</a></Button>
    </section>
  );
}
