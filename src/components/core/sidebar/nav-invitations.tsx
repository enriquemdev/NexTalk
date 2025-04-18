"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  InboxIcon,
  MailCheckIcon,
  MailQuestionIcon,
  Loader2
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDistanceToNow } from "date-fns";

export function NavInvitations() {
  const [openSection, setOpenSection] = useState<string | null>("received");
  
  const sentInvitations = useQuery(api.invitations.getSentInvitations, { limit: 10 }) || [];
  const receivedInvitations = useQuery(api.invitations.getReceivedInvitations, { limit: 10 }) || [];
  
  const isLoading = sentInvitations === undefined || receivedInvitations === undefined;
  const pendingCount = receivedInvitations?.length || 0;
  const sentCount = sentInvitations?.length || 0;

  // Force refresh sent invitations if there's an update
  useEffect(() => {
    if (sentInvitations.length === 0 && sentCount === 0) {
      const timer = setTimeout(() => {
        // This will trigger a requery
        setOpenSection(prev => prev === "sent" ? "sent" : prev);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [sentInvitations.length, sentCount]);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <SidebarGroup>
      <Link href="/invitations" className="group">
        <div className="flex items-center justify-between my-4 px-2 py-1 rounded-md transition-colors hover:bg-secondary/50">
          <div className="flex items-center gap-2">
            <InboxIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <SidebarGroupLabel className="group-hover:text-primary transition-colors">Invitations</SidebarGroupLabel>
            {pendingCount > 0 && (
              <Badge variant="default" className="ml-1 bg-primary text-primary-foreground">
                {pendingCount}
              </Badge>
            )}
          </div>
        </div>
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <SidebarMenu>
          <SidebarMenuItem className="overflow-hidden">
            <button 
              onClick={() => toggleSection("received")}
              className="flex w-full items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors hover:bg-secondary/50"
            >
              <MailQuestionIcon className="h-4 w-4 text-muted-foreground" />
              <span>Received</span>
              {pendingCount > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {pendingCount}
                </Badge>
              )}
              <ChevronRight 
                className={`ml-auto h-4 w-4 transition-transform duration-200 ${openSection === "received" ? "rotate-90" : ""}`} 
              />
            </button>
            
            <AnimatePresence>
              {openSection === "received" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 pr-2 py-1">
                    {receivedInvitations.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-muted-foreground bg-secondary/20 rounded-md">
                        No invitations received
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {receivedInvitations.slice(0, 4).map((invitation) => (
                          <Link 
                            key={invitation._id}
                            href={`/rooms/${invitation.roomId}`}
                            className="block p-2 text-sm rounded-md hover:bg-secondary/50 transition-colors"
                          >
                            <div className="font-medium line-clamp-1">{invitation.room?.name || 'Unnamed Room'}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="line-clamp-1">From: {invitation.inviter?.name || 'Unknown'}</span>
                              <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground"></span>
                              <span>{formatDistanceToNow(invitation.createdAt, { addSuffix: true })}</span>
                            </div>
                          </Link>
                        ))}
                        
                        {receivedInvitations.length > 4 && (
                          <Link 
                            href="/invitations"
                            className="block text-center p-1 text-xs text-primary hover:underline"
                          >
                            View {receivedInvitations.length - 4} more...
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SidebarMenuItem>

          <SidebarMenuItem className="overflow-hidden">
            <button 
              onClick={() => toggleSection("sent")}
              className="flex w-full items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors hover:bg-secondary/50"
            >
              <MailCheckIcon className="h-4 w-4 text-muted-foreground" />
              <span>Sent</span>
              {sentCount > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {sentCount}
                </Badge>
              )}
              <ChevronRight 
                className={`ml-auto h-4 w-4 transition-transform duration-200 ${openSection === "sent" ? "rotate-90" : ""}`} 
              />
            </button>
            
            <AnimatePresence>
              {openSection === "sent" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 pr-2 py-1">
                    {sentInvitations.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-muted-foreground bg-secondary/20 rounded-md">
                        No invitations sent
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sentInvitations.slice(0, 4).map((invitation) => (
                          <Link 
                            key={invitation._id}
                            href={`/rooms/${invitation.roomId}`}
                            className="block p-2 text-sm rounded-md hover:bg-secondary/50 transition-colors"
                          >
                            <div className="font-medium line-clamp-1">{invitation.room?.name || 'Unnamed Room'}</div>
                            <div className="text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span className="line-clamp-1">To: {invitation.email}</span>
                                <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground"></span>
                                <span>{formatDistanceToNow(invitation.createdAt, { addSuffix: true })}</span>
                              </div>
                              <div className="mt-0.5">
                                Status: <span className={`${
                                  invitation.status === "pending" ? "text-amber-500" : 
                                  invitation.status === "used" ? "text-green-500" : 
                                  "text-muted-foreground"
                                }`}>
                                  {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                        
                        {sentInvitations.length > 4 && (
                          <Link 
                            href="/invitations"
                            className="block text-center p-1 text-xs text-primary hover:underline"
                          >
                            View {sentInvitations.length - 4} more...
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
    </SidebarGroup>
  );
} 