"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useMutation } from "@tanstack/react-query";
import {
  Upload,
  Clock,
  Eye,
  Loader2,
  Check,
  X,
  Copy,
  Building,
  Users,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBrowserClient } from "@supabase/ssr";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { SITE_URL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { TERMS, SEO_KEYWORDS } from "@/lib/constants";
import { SEO } from "@/components/seo";
import { NotificationStatus } from "@/components/notification-status";
import { useOrganization } from "@/hooks/use-organization";

// Simplified schema without complex types
const formSchema = z.object({
  file: z.any(), // Use any to avoid File type issues
  expiresInHours: z.number().min(1).max(168),
  maxViews: z.number().min(1).max(100),
  organizationUpload: z.boolean(),
});

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: organization } = useOrganization();

  // SEO structured data for upload page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "The Transporter File Upload",
    applicationCategory: "FileTransferApplication",
    operatingSystem: "All",
    description:
      "Upload and share files securely with time-limited and download-limited access.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  // Use any type to avoid TypeScript conflicts
  const form = useForm<any>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      expiresInHours: 24,
      maxViews: 5,
      organizationUpload: false,
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!user)
        throw new Error(
          `You must be logged in to ${TERMS.upload.toLowerCase()} ${TERMS.file.toLowerCase()}s`
        );

      const file = values.file as File;
      if (!file) throw new Error("No file selected");

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const linkId = uuidv4();

      // Get organization_id if organizationUpload is enabled
      let organizationId: string | null = null;
      if (values.organizationUpload && organization) {
        organizationId = organization.id;
      }

      // Create a safe filename by removing special characters
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

      // Create a unique file path with the safe filename
      const filePath = `${user.id}/${linkId}/${safeFileName}`;

      console.log(`Uploading file to path: ${filePath}`);

      // 1. Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("secure-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // 2. Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + values.expiresInHours);

      // 3. Store metadata in database with organization_id
      const { error: dbError } = await supabase
        .from("shared_files")
        .insert({
          user_id: user.id,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          link_id: linkId,
          expires_at: expiresAt.toISOString(),
          max_views: values.maxViews,
          views: 0,
          organization_id: organizationId,
        })
        .select();

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      return {
        linkId,
        fileName: file.name,
        isOrganizationFile: !!organizationId,
      };
    },
    onSuccess: (data) => {
      const shareUrl = `${SITE_URL}/share/${data.linkId}`;
      setShareLink(shareUrl);
      toast({
        title: `${TERMS.file} ${TERMS.upload.toLowerCase()}ed successfully`,
        description: `Your ${TERMS.file.toLowerCase()} has been ${TERMS.upload.toLowerCase()}ed ${
          data.isOrganizationFile
            ? "and shared with your organization"
            : "and is ready to share"
        }.`,
      });
    },
    onError: (error) => {
      toast({
        title: `${TERMS.upload} failed`,
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      form.setValue("file", file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedFile(file);
      form.setValue("file", file);
    }
  };

  const onSubmit = (values: any) => {
    uploadMutation.mutate(values);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The text has been copied to your clipboard.",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    else return (bytes / 1073741824).toFixed(1) + " GB";
  };

  return (
    <>
      <SEO
        title={`${TERMS.upload} a File Securely`}
        description={`${TERMS.upload} and share files securely with time-limited access and download limits. Keep your sensitive files protected.`}
        canonical="/upload"
        keywords={SEO_KEYWORDS.upload}
        structuredData={structuredData}
      />

      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">
                {TERMS.upload} a {TERMS.file.toLowerCase()}
              </h1>
              <p className="text-muted-foreground">
                {TERMS.upload} a {TERMS.file.toLowerCase()} to{" "}
                {TERMS.transport.toLowerCase()} securely with time-limited and{" "}
                {TERMS.views.toLowerCase()}-limited access.
              </p>
            </div>

            <NotificationStatus />

            {shareLink ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center p-6">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-semibold">
                        {TERMS.file} {TERMS.upload.toLowerCase()}ed
                        successfully!
                      </h2>
                      <p className="text-muted-foreground">
                        Your {TERMS.file.toLowerCase()} has been{" "}
                        {TERMS.upload.toLowerCase()}ed and is ready to{" "}
                        {TERMS.transport.toLowerCase()}. Copy the{" "}
                        {TERMS.link.toLowerCase()} below to{" "}
                        {TERMS.transport.toLowerCase()} it.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={shareLink}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(shareLink)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setShareLink(null);
                          setUploadedFile(null);
                          form.reset();
                        }}
                      >
                        {TERMS.upload} another {TERMS.file.toLowerCase()}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <FormLabel>{TERMS.file}</FormLabel>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-primary/50"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() =>
                        document.getElementById("file-upload")?.click()
                      }
                    >
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      {uploadedFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            <span className="font-medium">
                              {uploadedFile.name}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatFileSize(uploadedFile.size)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFile(null);
                              form.setValue("file", null);
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove {TERMS.file.toLowerCase()}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">
                            Drag and drop your {TERMS.file.toLowerCase()} here,
                            or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supports any file format
                          </p>
                        </div>
                      )}
                    </div>
                    {form.formState.errors.file && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.file.message as string}
                      </p>
                    )}
                  </div>

                  {/* Organization Upload Toggle - Only show if user is in an organization */}
                  {organization && (
                    <FormField
                      control={form.control}
                      name="organizationUpload"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Share with Organization
                            </FormLabel>
                            <FormDescription className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Make this file accessible to all{" "}
                              {organization.name} members
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={uploadMutation.isPending}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="expiresInHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="h-4 w-4" /> {TERMS.expires} in
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                min={1}
                                max={168}
                                step={1}
                                defaultValue={[field.value]}
                                onValueChange={(value: number[]) =>
                                  field.onChange(value[0])
                                }
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {field.value}{" "}
                                  {field.value === 1 ? "hour" : "hours"}
                                </span>
                                <span>
                                  {Math.round(field.value / 24)}{" "}
                                  {Math.round(field.value / 24) === 1
                                    ? "day"
                                    : "days"}
                                </span>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            The {TERMS.link.toLowerCase()} will expire after
                            this time period
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxViews"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Eye className="h-4 w-4" /> Max{" "}
                            {TERMS.views.toLowerCase()}
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                min={1}
                                max={100}
                                step={1}
                                defaultValue={[field.value]}
                                onValueChange={(value: number[]) =>
                                  field.onChange(value[0])
                                }
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {field.value}{" "}
                                  {field.value === 1
                                    ? TERMS.views.toLowerCase().slice(0, -1)
                                    : TERMS.views.toLowerCase()}
                                </span>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            The {TERMS.link.toLowerCase()} will expire after
                            this many {TERMS.views.toLowerCase()}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={uploadMutation.isPending || !uploadedFile}
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {`${TERMS.upload}ing...`}
                      </>
                    ) : (
                      `${TERMS.upload} and generate ${TERMS.link.toLowerCase()}`
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
