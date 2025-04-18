'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Mail, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRoomContext } from '@livekit/components-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface User {
  _id: Id<"users">;
  name?: string;
  email?: string;
  imageUrl?: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  roomId?: Id<"rooms">;
}

export function InviteModal({ isOpen, onClose, roomName, roomId: propRoomId }: InviteModalProps) {
  const [activeTab, setActiveTab] = useState<string>('users');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [manualEmail, setManualEmail] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  
  const room = useRoomContext();
  
  // Fetch all users for selection
  const users = useQuery(api.users.listUsers, {}) || [];
  
  // Add the createInvitation mutation
  const createInvitation = useMutation(api.invitations.createInvitation);
  
  // Get the room ID from the room name if not provided directly
  const roomIdFromName = useQuery(api.rooms.getRoomIdByVideoRoomName, { 
    roomName 
  });
  
  // Determine the final room ID to use
  const roomId = propRoomId || roomIdFromName;

  // Debug logging
  useEffect(() => {
    console.log('InviteModal - Room name:', roomName);
    console.log('InviteModal - Direct Room ID:', propRoomId);
    console.log('InviteModal - Room ID from name lookup:', roomIdFromName);
    console.log('InviteModal - Final Room ID to use:', roomId);
  }, [roomName, propRoomId, roomIdFromName, roomId]);

  // Filter users based on search query
  const filteredUsers = searchQuery.trim()
    ? users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  // Toggle user selection in the list
  const toggleUserSelection = (user: User) => {
    if (selectedUsers.some(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setManualEmail('');
      setSearchQuery('');
      setSelectedUsers([]);
    }
  }, [isOpen]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (activeTab === 'email' && !manualEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (activeTab === 'users' && selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    // Validate room ID is available
    if (!roomId) {
      console.error('Room ID is missing - cannot send invitation');
      toast.error('Room information is missing');
      return;
    }
    
    setIsSending(true);
    console.log('handleSendInvite - Starting to send invitations with roomId:', roomId);
    
    try {
      // Send invitations to selected users or manual email
      if (activeTab === 'users') {
        // Map selected users to their emails, filtering out any undefined emails
        const emails = selectedUsers
          .map(user => user.email)
          .filter((email): email is string => !!email);
          
        if (emails.length === 0) {
          throw new Error('No valid email addresses found');
        }
        
        console.log(`handleSendInvite - Sending to ${emails.length} users:`, emails);
        
        // Send invitations to each email
        let failedEmails = 0;
        await Promise.all(emails.map(async (email) => {
          try {
            // Create invitation record in Convex
            console.log(`Creating Convex invitation record for ${email} with roomId:`, roomId);
            const invitationResult = await createInvitation({
              roomId,
              email
            });
            console.log(`Invitation record created:`, invitationResult);
            
            // Send email notification
            await sendInvitation(email);
          } catch (error) {
            failedEmails++;
            console.error(`Error sending to ${email}:`, error);
          }
        }));
        
        toast.success(`Invitations sent to ${emails.length - failedEmails} users`);
      } else {
        // Create invitation record in Convex
        console.log(`Creating Convex invitation record for ${manualEmail.trim()} with roomId:`, roomId);
        const invitationResult = await createInvitation({
          roomId,
          email: manualEmail.trim()
        });
        console.log(`Invitation record created:`, invitationResult);
        
        // Send to manually entered email
        await sendInvitation(manualEmail.trim());
        toast.success(`Invitation sent to ${manualEmail}`);
      }
      
      // Reset state and close modal
      setManualEmail('');
      setSelectedUsers([]);
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  
  // Helper function to send invitation to a single email
  const sendInvitation = async (email: string) => {
    console.log(`sendInvitation - Sending email to ${email} for room:`, roomName);
    
    const response = await fetch('/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        roomName,
        hostName: room.localParticipant.identity,
        roomId,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Failed to send invitation to ${email}` }));
      console.error('Email API error:', errorData);
      throw new Error(errorData.message || `Failed to send invitation to ${email}`);
    }
    
    const result = await response.json();
    console.log('Email API response:', result);
    return result;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Room</DialogTitle>
          <DialogDescription>
            Send an email invitation to join this video room.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              App Users
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <ScrollArea className="h-[240px] rounded-md border p-2">
                {filteredUsers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredUsers.map((user: User) => (
                      <div 
                        key={user._id}
                        className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent cursor-pointer"
                        onClick={() => toggleUserSelection(user)}
                      >
                        <Checkbox
                          checked={selectedUsers.some(u => u._id === user._id)}
                          onCheckedChange={() => toggleUserSelection(user)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.imageUrl} />
                          <AvatarFallback>
                            {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || 'Unnamed User'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email || 'No email available'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No users found' : 'No users available'}
                    </p>
                  </div>
                )}
              </ScrollArea>
              
              {selectedUsers.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="email" className="mt-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                required
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSendInvite} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 