import { AppSidebar } from "@/components/core/app-sidebar";
import { ThemeToggle } from "@/components/core/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SmartphoneNfcIcon } from "lucide-react";
import React from "react";

const HomeLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="h-screen bg-gradient-to-b from-background to-background/90 w-full">
        <div className="flex flex-col w-full">
          <header className="border-b">
            <div className="container mx-auto py-4 px-4 flex items-center justify-start gap-4">
              <SidebarTrigger />
              <div className="flex items-center justify-between w-full">
                <h1 className="text-2xl font-bold flex gap-2 items-center">
                  <span>
                    <SmartphoneNfcIcon className="size-6" />
                  </span>
                  <span>NextTalk</span>
                </h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          </header>
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
};

export default HomeLayout;
