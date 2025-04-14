"use client";

import {
  ChevronRight,
  CircleCheckIcon,
  DiscIcon,
  MegaphoneIcon,
  Settings2,
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
import { CreateRoomForm } from "@/components/CreateRoomForm";
import Link from "next/link";

const nav = [
  {
    title: "Available Rooms",
    url: "#",
    icon: CircleCheckIcon,
    isActive: true,
  },
  {
    title: "Coming up",
    url: "#",
    icon: MegaphoneIcon,
    items: [{ _id: undefined, name: "No available" }],
  },
  {
    title: "Recordings",
    url: "#",
    icon: DiscIcon,
    items: [{ _id: undefined, name: "No available" }],
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings2,
    items: [{ _id: undefined, name: "No available" }],
  },
];
export function NavMain() {
  const { useLiveRooms, useScheduledRooms } = useRooms();

  const liveRooms = useLiveRooms({ type: "live", limit: 10 });
  const scheduledRooms = useScheduledRooms({ type: "scheduled", limit: 10 });

  // if (liveRooms?.length === 0) {
  //   return (
  //     <div className="p-4 rounded-lg border">
  //       <Skeleton className="h-6 w-3/4 mb-2" />
  //       <Skeleton className="h-4 w-full mb-2" />
  //       <Skeleton className="h-4 w-1/2" />
  //     </div>
  //   );
  // }

  const new_nav = nav.map((nav) => {
    switch (nav.title) {
      case "Available Rooms":
        return {
          ...nav,
          items:
            liveRooms?.length === 0
              ? [{ name: "No available", _id: "" }]
              : liveRooms,
        };
      case "Coming up":
        return {
          ...nav,
          items:
            scheduledRooms?.length === 0
              ? [{ name: "No available", _id: "" }]
              : scheduledRooms,
        };
      default:
        return {
          ...nav,
        };
    }
  });

  return (
    <SidebarGroup>
      <div className="flex gap-4 items-center justify-between my-4">
        <SidebarGroupLabel>Rooms</SidebarGroupLabel>
        <SidebarGroupLabel>
          <CreateRoomForm />
        </SidebarGroupLabel>
      </div>
      <SidebarMenu>
        {new_nav.map((item) => (
          <Collapsible
            key={`${item?.title} ${item?.icon.name}`}
            asChild
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
                  {item?.items?.map((subItem) =>
                    subItem ? (
                      <SidebarMenuSubItem key={`${subItem.name}`}>
                        <SidebarMenuSubButton asChild>
                          {subItem._id !== "" ? (
                            <Link href={`/rooms/${subItem._id}`}>
                              <span>{subItem.name}</span>
                            </Link>
                          ) : (
                            <Link href={`/`}>
                              <span>{subItem.name}</span>
                            </Link>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ) : (
                      ""
                    )
                  )}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
