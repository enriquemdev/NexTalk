"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MoreHorizontal, Search, Eye, Settings, Trash2, Loader2 } from "lucide-react";

export default function RoomsManagementPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const rooms = useQuery(api.rooms.list, { limit: 100 });
  
  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter rooms based on search query
  const filteredRooms = searchQuery.trim() === "" 
    ? rooms 
    : rooms?.filter(room => 
        (room.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/admin')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Room Management</h1>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            className="pl-8 w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {!rooms ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Privacy</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms && filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <TableRow key={room._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{room.name || "Unnamed Room"}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {room.description || "No description"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={room.type === 'video' ? 'default' : 'outline'}>
                        {room.type === 'video' ? 'Video' : 'Audio'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(room._creationTime)}</TableCell>
                    <TableCell>
                      <Badge variant={room.status === 'live' ? 'default' : 'outline'}>
                        {room.status || 'scheduled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {room.isPrivate ? (
                        <Badge variant="destructive">Private</Badge>
                      ) : (
                        <Badge variant="outline">Public</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/${room.type === 'video' ? 'video-rooms' : 'room'}/${room._id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>View Room</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Edit Room</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete Room</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchQuery ? "No rooms match your search." : "No rooms found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 