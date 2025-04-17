"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Trash2, Settings, FileText, Video } from "lucide-react";
import { LucideIcon } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const allUsers = useQuery(api.users.listUsers, { limit: 100 });
  const totalRooms = useQuery(api.rooms.count);
  
  const isLoading = allUsers === undefined || totalRooms === undefined;
  
  const AdminCard = ({ 
    title, 
    description, 
    icon: Icon, 
    href, 
    count, 
    variant = "default" 
  }: { 
    title: string; 
    description: string; 
    icon: LucideIcon; 
    href: string; 
    count?: number | string;
    variant?: "default" | "destructive";
  }) => (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <span>{title}</span>
          </span>
          {count !== undefined && (
            <span className="text-lg font-bold">{count}</span>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {/* Card content can go here if needed */}
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          onClick={() => router.push(href)} 
          variant={variant}
          className="w-full"
        >
          Manage
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link href="/">
          <Button variant="outline">Back to App</Button>
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{allUsers?.length || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{totalRooms || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Active Now</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">-</p>
              </CardContent>
            </Card>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Management Tools</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AdminCard
              title="User Management"
              description="View, edit, and manage user accounts"
              icon={Users}
              href="/admin/users"
              count={allUsers?.length}
            />
            
            <AdminCard
              title="Room Management"
              description="Monitor and manage all audio/video rooms"
              icon={Video}
              href="/admin/rooms"
              count={totalRooms}
            />
            
            <AdminCard
              title="Content Moderation"
              description="Review reported content and users"
              icon={FileText}
              href="/admin/moderation"
            />
            
            <AdminCard
              title="System Settings"
              description="Configure platform settings and parameters"
              icon={Settings}
              href="/admin/settings"
            />
            
            <AdminCard
              title="Reset Users Database"
              description="Delete all users from the database"
              icon={Trash2}
              href="/admin/reset-users"
              variant="destructive"
            />
          </div>
        </>
      )}
    </div>
  );
} 