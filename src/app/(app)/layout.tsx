import { AppSidebar } from "@/components/core/app-sidebar";
import SearchBar from "@/components/core/search-bar";
import { ThemeToggle } from "@/components/core/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
            <div className="py-4 px-4 flex items-center justify-start gap-4">
              <SidebarTrigger />
              <div className="flex items-center justify-end w-full">
                <SearchBar />
                <ThemeToggle />
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
