"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useMutation } from "@tanstack/react-query";
import { Upload, Clock, Eye, Loader2, Check, X, Copy } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { SITE_URL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { TERMS, SEO_KEYWORDS } from "@/lib/constants";
import { SEO } from "@/components/seo";
import { NotificationStatus } from "@/components/notification-status";

const formSchema = z.object({
  file: z.instanceof(File, {
    message: `Please select a ${TERMS.file.toLowerCase()}`,
  }),
  expiresInHours: z.number().min(1).max(168),
  maxViews: z.number().min(1).max(100),
});

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expiresInHours: 24,
      maxViews: 5,
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!user)
        throw new Error(
          `You must be logged in to ${TERMS.upload.toLowerCase()} ${TERMS.file.toLowerCase()}s`
        );

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const file = values.file;
      const linkId = uuidv4();

      // Create a safe filename by removing special characters
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

      // Create a unique file path with the safe filename
      const filePath = `${user.id}/${linkId}/${safeFileName}`;

      console.log(`Uploading file to path: ${filePath}`);

      // 1. Upload file to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("secure-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // 2. Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + values.expiresInHours);

      // 3. Store metadata in database
      const { error: dbError, data: dbData } = await supabase
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
        })
        .select();

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      console.log("Database entry created:", dbData);

      return {
        linkId,
        fileName: file.name,
      };
    },
    onSuccess: (data) => {
      const shareUrl = `${SITE_URL}/share/${data.linkId}`;
      setShareLink(shareUrl);
      toast({
        title: `${TERMS.file} ${TERMS.upload.toLowerCase()}ed successfully`,
        description: `Your ${TERMS.file.toLowerCase()} has been ${TERMS.upload.toLowerCase()}ed and is ready to ${TERMS.transport.toLowerCase()}.`,
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

  const onSubmit = (values: z.infer<typeof formSchema>) => {
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
                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                        <FormLabel>{TERMS.file}</FormLabel>
                        <FormControl>
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
                              {...rest}
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
                                    form.setValue("file", undefined as any);
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
                                  Drag and drop your {TERMS.file.toLowerCase()}{" "}
                                  here, or click to browse
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Supports any file format
                                </p>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
