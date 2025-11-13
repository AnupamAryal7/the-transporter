"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useOrganization,
  useNotices,
  useOrganizationMembers,
  useLeaveOrganization,
  useCreateNotice,
  useOrganizationFiles,
} from "@/hooks/use-organization";
import { useAuth } from "@/components/auth-provider";
import {
  Building,
  Users,
  MessageSquare,
  LogOut,
  UserCog,
  Trash2,
  Edit3,
  Plus,
  Crown,
  FileIcon,
  Download,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TERMS } from "@/lib/constants";
import { Header } from "@/components/header";

export default function OrganizationPage() {
  const { user } = useAuth();
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: notices, isLoading: noticesLoading } = useNotices(
    organization?.id
  );
  const { data: members, isLoading: membersLoading } = useOrganizationMembers(
    organization?.id
  );
  const { data: files, isLoading: filesLoading } = useOrganizationFiles();
  const leaveOrganization = useLeaveOrganization();
  const createNotice = useCreateNotice();
  const { toast } = useToast();

  const [newNoticeTitle, setNewNoticeTitle] = useState("");
  const [newNoticeContent, setNewNoticeContent] = useState("");
  const [showCreateNotice, setShowCreateNotice] = useState(false);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !newNoticeTitle || !newNoticeContent) return;

    try {
      await createNotice.mutateAsync({
        organizationId: organization.id,
        title: newNoticeTitle,
        content: newNoticeContent,
      });
      setNewNoticeTitle("");
      setNewNoticeContent("");
      setShowCreateNotice(false);
    } catch (error) {
      console.error("Failed to create notice:", error);
    }
  };

  const handleLeaveOrganization = async () => {
    if (window.confirm("Are you sure you want to leave this organization?")) {
      try {
        await leaveOrganization.mutateAsync();
      } catch (error) {
        console.error("Failed to leave organization:", error);
      }
    }
  };

  const handleDownload = async (linkId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/download?linkId=${linkId}`, {
        method: "GET",
        headers: {
          Accept: "application/octet-stream, */*",
        },
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download successful",
        description: "File downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    else return (bytes / 1073741824).toFixed(1) + " GB";
  };

  if (orgLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Header />
        <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">No Organization</h1>
        <p className="text-muted-foreground mb-4">
          You are not a member of any organization.
        </p>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    );
  }

  const isAdmin = organization.userRole === "office-admin";
  const memberCount = members?.length || 0;

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <Header />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8" />
            {organization.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {organization.description || "No description provided"}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {memberCount} / {organization.max_members} members
            </span>
            <span className="capitalize flex items-center gap-1">
              <Crown className="h-4 w-4" />
              {organization.userRole}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleLeaveOrganization}
          disabled={leaveOrganization.isPending}
        >
          {leaveOrganization.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          Leave Organization
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notices" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notice Board
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileIcon className="h-4 w-4" />
            Organization Files
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({memberCount})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Notices Tab */}
        <TabsContent value="notices" className="space-y-4">
          <div className="flex justify-between items-center">
            <CardDescription>
              Organization announcements and important messages
            </CardDescription>
            {isAdmin && (
              <Dialog
                open={showCreateNotice}
                onOpenChange={setShowCreateNotice}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Notice
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Notice</DialogTitle>
                    <DialogDescription>
                      Share an important message with all organization members.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateNotice} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newNoticeTitle}
                        onChange={(e) => setNewNoticeTitle(e.target.value)}
                        placeholder="Enter notice title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={newNoticeContent}
                        onChange={(e) => setNewNoticeContent(e.target.value)}
                        placeholder="Enter notice content"
                        rows={5}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateNotice(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          !newNoticeTitle ||
                          !newNoticeContent ||
                          createNotice.isPending
                        }
                      >
                        {createNotice.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Create Notice"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {noticesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : notices && notices.length > 0 ? (
            <div className="space-y-4">
              {notices.map((notice) => (
                <Card key={notice.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {notice.title}
                        </CardTitle>
                        <CardDescription>
                          By {notice.user_profiles?.email} •{" "}
                          {new Date(notice.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{notice.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Notices Yet</h3>
                <p className="text-muted-foreground">
                  {isAdmin
                    ? "Create the first notice to share with your organization members."
                    : "No announcements have been posted yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Organization Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <CardDescription>
            Files shared with your organization members
          </CardDescription>

          <Button asChild className="w-full">
            <Link href="/organization/files">
              <FileIcon className="h-4 w-4 mr-2" />
              View All Organization Files
            </Link>
          </Button>

          {/* Preview of recent files here */}
          <div className="grid gap-4">
            {filesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : files && files.length > 0 ? (
              files.slice(0, 3).map((file) => (
                <Card key={file.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {file.file_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.file_size)} •{" "}
                          {format(new Date(file.created_at), "MMM d")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDownload(file.link_id, file.file_name)
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Files Yet</h3>
                  <p className="text-muted-foreground">
                    No files have been shared in your organization yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <CardDescription>All members of your organization</CardDescription>

          {membersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : members && members.length > 0 ? (
            <div className="grid gap-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.user_profiles?.email}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="capitalize">{member.role}</span>
                            <span>•</span>
                            <span>
                              Joined{" "}
                              {new Date(member.joined_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isAdmin && member.role === "office-member" && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Promote to Admin
                          </Button>
                          <Button variant="outline" size="sm">
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Members</h3>
                <p className="text-muted-foreground">
                  There are no members in this organization yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Manage your organization settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="secretKey">Organization Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secretKey"
                      value={organization.secret_key}
                      readOnly
                      className="font-mono text-lg tracking-widest"
                    />
                    <Button variant="outline">Regenerate</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this code with members who want to join your
                    organization
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxMembers">Maximum Members</Label>
                  <div className="flex gap-2">
                    <Input
                      id="maxMembers"
                      type="number"
                      value={organization.max_members}
                      min={2}
                      max={100}
                    />
                    <Button>Update</Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="destructive">Delete Organization</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
