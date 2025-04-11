import React from 'react';

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={`border-t py-4 text-center text-sm text-muted-foreground ${className}`}>
      © {new Date().getFullYear()} NextTalk. All rights reserved.
    </footer>
  );
} 