"use client";

import { InboxIcon, MailCheckIcon, MailQuestionIcon } from "lucide-react";
import { InvitationsTable } from "@/components/invitations/invitations-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function InvitationsPage() {
  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex items-center gap-3">
        <InboxIcon className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Invitations</h1>
          <p className="text-muted-foreground">Manage your room invitations</p>
        </div>
      </div>
      
      <Separator className="my-2" />
      
      <Card>
        <CardHeader>
          <CardTitle>Room Invitations</CardTitle>
          <CardDescription>
            View and manage all your room invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="received" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="received" className="flex items-center gap-2">
                <MailQuestionIcon className="h-4 w-4" />
                Received Invitations
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex items-center gap-2">
                <MailCheckIcon className="h-4 w-4" />
                Sent Invitations
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="received">
              <InvitationsTable type="received" />
            </TabsContent>
            
            <TabsContent value="sent">
              <InvitationsTable type="sent" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 