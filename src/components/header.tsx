import React from 'react';

export function Header() {
  return (
    <header className="border-b py-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">NextTalk</h1>
        {/* Add Navigation/User Auth later */}
      </div>
    </header>
  );
} 