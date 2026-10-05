import { SmartphoneNfcIcon } from "lucide-react";
import React from "react";
import { JoinPrivateRoomButton } from "./rooms/join-private-room-button";
// import { CreateRoomForm } from "./CreateRoomForm"; // Assuming general room creation is here - commented out
import { CreateVideoRoomButton } from "./rooms/create-video-room-button";
import { AuthButton } from "./auth/auth-button";

export function Header() {
  return (
    <header className="border-b py-4">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-2xl font-bold flex gap-2 items-center">
          <span>
            <SmartphoneNfcIcon className="size-6" />
          </span>
          <span>NexTalk</span>
        </div>
        
        {/* Right side actions */}
        <div className="flex flex-wrap items-center gap-2">
           <JoinPrivateRoomButton />
           <CreateVideoRoomButton /> 
           {/* <CreateRoomForm /> */}
           <AuthButton />
        </div>
      </div>
    </header>
  );
}
