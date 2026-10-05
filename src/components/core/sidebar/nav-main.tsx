"use client";

import {
  ChevronRight,
  CircleCheckIcon,
  MegaphoneIcon,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useRooms } from "@/hooks/useRooms";
import Link from "next/link";

export function NavMain() {
  const { useLiveRooms, useScheduledRooms } = useRooms();
  const liveRooms = useLiveRooms({ type: "live", limit: 10 });
  const scheduledRooms = useScheduledRooms({ type: "scheduled", limit: 10 });
  const nav = [
    { title: "Live rooms", icon: CircleCheckIcon, items: liveRooms, empty: "No live rooms yet" },
    { title: "Coming up", icon: MegaphoneIcon, items: scheduledRooms, empty: "No upcoming rooms" },
  ];

  return (
    <SidebarGroup>
      <div className="flex gap-4 items-center justify-between my-4">
        <SidebarGroupLabel>Rooms</SidebarGroupLabel>
      </div>
      <SidebarMenu>
        {nav.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item?.title}>
                  {item?.icon && <item.icon />}
                  <span>{item?.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items === undefined ? (
                    <li className="px-2 py-2 text-xs text-muted-foreground" role="status">Loading rooms...</li>
                  ) : item.items.length === 0 ? (
                    <li className="px-2 py-2 text-xs text-muted-foreground">{item.empty}</li>
                  ) : item.items.map((room) => (
                    <SidebarMenuSubItem key={room._id}>
                      {room.status === "live" ? <SidebarMenuSubButton asChild>
                        <Link href={room.type === "video" ? `/video-rooms/${room._id}` : `/rooms/${room._id}`}>
                          <span>{room.name}</span>
                        </Link>
                      </SidebarMenuSubButton> : <span className="block px-2 py-2 text-xs text-muted-foreground">{room.name} · not started</span>}
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton disabled tooltip="Audio recording and replay are not available">
            <span>Recordings · not available</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
