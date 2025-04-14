import { SmartphoneNfcIcon } from "lucide-react";
import React from "react";

export function Header() {
  return (
    <header className="">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold flex gap-2 items-center">
          <span>
            <SmartphoneNfcIcon className="size-6" />
          </span>
          <span>NextTalk</span>
        </h1>
        {/* Add Navigation/User Auth later */}
      </div>
    </header>
  );
}
