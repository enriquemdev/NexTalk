"use client";

import { InboxIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function NavInvitations() {
  const sentInvitations = useQuery(api.invitations.getSentInvitations, { limit: 10 }) || [];
  const receivedInvitations = useQuery(api.invitations.getReceivedInvitations, { limit: 10 }) || [];
  
  const totalCount = (receivedInvitations?.length || 0) + (sentInvitations?.length || 0);

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <Link href="/invitations">
            <SidebarMenuButton tooltip="Invitations">
              <InboxIcon className="h-5 w-5" />
              <span>Invitations</span>
              {totalCount > 0 && (
                <Badge variant="default" className="ml-auto bg-primary text-primary-foreground">
                  {totalCount}
                </Badge>
              )}
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
} 