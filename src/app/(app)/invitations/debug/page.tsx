"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Id } from "../../../../../convex/_generated/dataModel";

// Invitation interface
interface Invitation {
  _id: Id<"invitations">;
  roomId: Id<"rooms">;
  email: string;
  token: string;
  status: "pending" | "used" | "expired";
  invitedBy: Id<"users">;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
}

// Debug data interface
interface DebugData {
  total: number;
  pending: number;
  used: number;
  expired: number;
  sentByMe: number;
  user: {
    _id: Id<"users">;
    name?: string;
    email?: string;
    tokenIdentifier: string;
  } | null;
  invitations: Invitation[];
}

export default function DebugInvitationsPage() {
  const [showDetails, setShowDetails] = useState(false);
  const debugData = useQuery(api.invitations.debugGetAllInvitations) as DebugData | { error: string } | undefined;
  
  if (!debugData) {
    return (
      <div className="flex flex-col w-full gap-4 p-6">
        <h1 className="text-2xl font-bold">Invitation Debug</h1>
        <p>Loading invitation data...</p>
      </div>
    );
  }
  
  if ('error' in debugData) {
    return (
      <div className="flex flex-col w-full gap-4 p-6">
        <h1 className="text-2xl font-bold">Invitation Debug</h1>
        <p className="text-red-500">Error: {debugData.error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-4 p-6">
      <h1 className="text-2xl font-bold">Invitation Debug</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Invitation Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Total Invitations:</strong> {debugData.total}</p>
              <p><strong>Pending:</strong> {debugData.pending}</p>
              <p><strong>Used:</strong> {debugData.used}</p>
              <p><strong>Expired:</strong> {debugData.expired}</p>
              <p><strong>Sent by me:</strong> {debugData.sentByMe}</p>
            </div>
            
            <div>
              <p><strong>User ID:</strong> {debugData.user?._id}</p>
              <p><strong>User Name:</strong> {debugData.user?.name || "Not set"}</p>
              <p><strong>User Email:</strong> {debugData.user?.email || "Not set"}</p>
              <p><strong>Token Identifier:</strong> {debugData.user?.tokenIdentifier.substring(0, 20)}...</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <Button 
            variant="outline" 
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide Details" : "Show Invitation Details"}
          </Button>
          
          {showDetails && (
            <div className="mt-4 space-y-4">
              <h3 className="font-semibold text-lg">Recent Invitations (Up to 20)</h3>
              <div className="space-y-2">
                {debugData.invitations.map((invitation: Invitation) => (
                  <div key={invitation._id} className="p-3 rounded-md border">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span>
                        <Badge variant={
                          invitation.status === "pending" ? "secondary" :
                          invitation.status === "used" ? "default" :
                          "outline"
                        }>
                          {invitation.status}
                        </Badge>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(invitation.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-2"><strong>To:</strong> {invitation.email}</p>
                    <p><strong>Room ID:</strong> {invitation.roomId}</p>
                    <p><strong>Sent by:</strong> {invitation.invitedBy}</p>
                    <p><strong>Expires:</strong> {formatDistanceToNow(invitation.expiresAt, { addSuffix: true })}</p>
                    {invitation.status === "used" && invitation.usedAt && (
                      <p><strong>Used at:</strong> {formatDistanceToNow(invitation.usedAt, { addSuffix: true })}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 