"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Loader2, Check, Clock, X } from "lucide-react";

interface InvitationsTableProps {
  type: "sent" | "received";
}

export function InvitationsTable({ type }: InvitationsTableProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  // Always call hooks at the top level, then use the results conditionally
  const sentInvitations = useQuery(api.invitations.getSentInvitations, { limit: 50 }) || [];
  const receivedInvitations = useQuery(api.invitations.getReceivedInvitations, { limit: 50 }) || [];

  // Current invitations being displayed
  const invitations = type === "sent" ? sentInvitations : receivedInvitations;

  // Handle joining a room from an invitation
  const handleJoinRoom = (roomId: Id<"rooms">) => {
    // Find the invitation for this room
    const invitation = invitations.find(inv => inv.roomId === roomId);
    
    if (invitation) {
      const invitationId = invitation._id.toString();
      setIsLoading(prev => ({ ...prev, [invitationId]: true }));
    }
    
    router.push(`/rooms/${roomId}`);
  };

  // Determine status badge color and text
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "used":
        return <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><Check className="h-3 w-3" /> Accepted</Badge>;
      case "expired":
        return <Badge variant="outline" className="flex items-center gap-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"><X className="h-3 w-3" /> Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // If no invitations, show an empty state
  if (invitations.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No invitations found</CardTitle>
          <CardDescription>
            {type === "received" 
              ? "You haven't received any invitations yet."
              : "You haven't sent any invitations yet."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-t p-6">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
          >
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room</TableHead>
            <TableHead>{type === "sent" ? "Recipient" : "From"}</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation._id}>
              <TableCell className="font-medium">
                {invitation.room?.name || "Unnamed Room"}
              </TableCell>
              <TableCell>
                {type === "sent" 
                  ? invitation.email 
                  : invitation.inviter?.name || "Unknown"}
              </TableCell>
              <TableCell>
                {getStatusBadge(invitation.status)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(invitation.createdAt, { addSuffix: true })}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleJoinRoom(invitation.roomId)}
                  disabled={isLoading[invitation._id]}
                  className="flex items-center gap-1"
                >
                  {isLoading[invitation._id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Join Room
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 