"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Copy, Loader2, FileIcon, Trash2, Eye } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { SharedFile } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TERMS, SEO_KEYWORDS } from "@/lib/constants"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { SEO } from "@/components/seo"
import { useAuth } from "@/components/auth-provider"

export default function DashboardPage() {
  const { toast } = useToast()
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const { user } = useAuth()

  // SEO structured data for dashboard
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "File Management Dashboard | The Transporter",
    description: "Manage your secure shared files, track downloads, and control access to your content.",
    isPartOf: {
      "@type": "WebSite",
      name: "The Transporter",
      url: typeof window !== "undefined" ? window.location.origin : "",
    },
  }

  const {
    data: files,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["shared-files", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Authentication required")

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      // Only fetch files owned by the current user
      const { data, error } = await supabase
        .from("shared_files")
        .select("*")
        .eq("user_id", user.id) // Filter by user_id for security
        .order("created_at", { ascending: false })

      if (error) throw error
      return data as SharedFile[]
    },
    enabled: !!user, // Only run query if user is authenticated
  })

  useEffect(() => {
    if (error) {
      toast({
        title: `Error loading ${TERMS.file.toLowerCase()}s`,
        description:
          error instanceof Error ? error.message : `Failed to load your ${TERMS.transport.toLowerCase()}ed files`,
        variant: "destructive",
      })
    }
  }, [error, toast])

  const copyToClipboard = (linkId: string) => {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${linkId}`
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: `${TERMS.link} copied`,
      description: `The ${TERMS.link.toLowerCase()} has been copied to your clipboard.`,
    })
  }

  const deleteFile = async () => {
    if (!fileToDelete || !user) return

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      // Find the file to delete
      const fileToDeleteData = files?.find((file) => file.id === fileToDelete)
      if (!fileToDeleteData) throw new Error(`${TERMS.file} not found`)

      // Security check - verify the file belongs to the current user
      if (fileToDeleteData.user_id !== user.id) {
        throw new Error("Unauthorized: You don't have permission to delete this file")
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage.from("secure-files").remove([fileToDeleteData.file_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase.from("shared_files").delete().eq("id", fileToDelete)

      if (dbError) throw dbError

      toast({
        title: `${TERMS.file} deleted`,
        description: `The ${TERMS.file.toLowerCase()} has been deleted successfully.`,
      })

      // Refresh the file list
      refetch()
    } catch (error) {
      toast({
        title: `Error deleting ${TERMS.file.toLowerCase()}`,
        description: error instanceof Error ? error.message : `Failed to delete the ${TERMS.file.toLowerCase()}`,
        variant: "destructive",
      })
    } finally {
      setFileToDelete(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
    else return (bytes / 1073741824).toFixed(1) + " GB"
  }

  const isExpired = (file: SharedFile) => {
    const now = new Date()
    const expiresAt = new Date(file.expires_at)
    return now > expiresAt || file.views >= file.max_views
  }

  const previewFileHandler = async (file: SharedFile) => {
    if (isExpired(file)) return

    // Security check - verify the file belongs to the current user
    if (file.user_id !== user?.id) {
      toast({
        title: "Unauthorized",
        description: "You don't have permission to preview this file",
        variant: "destructive",
      })
      return
    }

    setPreviewFile(file)
    setIsLoadingPreview(true)

    try {
      // Add source=dashboard to indicate this is an authenticated request
      const response = await fetch(`/api/download?linkId=${file.link_id}&preview=true&source=dashboard`)
      if (!response.ok) {
        throw new Error("Failed to generate preview URL")
      }

      const data = await response.json()
      setPreviewUrl(data.url)
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Failed to generate preview",
        variant: "destructive",
      })
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const closePreview = () => {
    setPreviewFile(null)
    setPreviewUrl(null)
  }

  const getFileType = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase() || ""

    const imageTypes = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
    const videoTypes = ["mp4", "webm", "ogg", "mov"]
    const audioTypes = ["mp3", "wav", "ogg", "aac"]
    const pdfType = ["pdf"]
    const textTypes = ["txt", "md", "html", "css", "js", "json"]

    if (imageTypes.includes(extension)) return "image"
    if (videoTypes.includes(extension)) return "video"
    if (audioTypes.includes(extension)) return "audio"
    if (pdfType.includes(extension)) return "pdf"
    if (textTypes.includes(extension)) return "text"

    return "other"
  }

  // Rest of the component remains the same...
  // [Keep all the existing rendering code]

  return (
    <>
      <SEO
        title="Your Files Dashboard"
        description="Manage your secure shared files, track downloads, and control access to your content."
        canonical="/dashboard"
        keywords={SEO_KEYWORDS.dashboard}
        structuredData={structuredData}
        noindex={true} // Dashboard is private, so we don't want it indexed
      />

      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-10 px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Your {TERMS.file}s</h1>
            <p className="text-muted-foreground">
              Manage your {TERMS.upload.toLowerCase()}ed files and their {TERMS.link.toLowerCase()}s.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : files && files.length > 0 ? (
            <>
              {/* Desktop view - Table */}
              <div className="rounded-md border hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{TERMS.file}</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>{TERMS.expires}</TableHead>
                      <TableHead>{TERMS.views}</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id} className={isExpired(file) ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium truncate max-w-[200px]">{file.file_name}</span>
                            {isExpired(file) && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                Expired
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(file.file_size)}</TableCell>
                        <TableCell>{format(new Date(file.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(file.expires_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {file.views} / {file.max_views}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => previewFileHandler(file)}
                              disabled={isExpired(file)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(file.link_id)}
                              disabled={isExpired(file)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => setFileToDelete(file.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the {TERMS.file.toLowerCase()} and its{" "}
                                    {TERMS.link.toLowerCase()}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setFileToDelete(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={deleteFile}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile view - Cards */}
              <div className="grid gap-4 md:hidden">
                {files.map((file) => (
                  <Card key={file.id} className={isExpired(file) ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base truncate max-w-[200px]">{file.file_name}</CardTitle>
                        </div>
                        {isExpired(file) && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Expired</span>
                        )}
                      </div>
                      <CardDescription>{formatFileSize(file.file_size)}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p>{format(new Date(file.created_at), "MMM d, yyyy")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{TERMS.expires}</p>
                          <p>{format(new Date(file.expires_at), "MMM d, yyyy")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{TERMS.views}</p>
                          <p>
                            {file.views} / {file.max_views}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => previewFileHandler(file)}
                        disabled={isExpired(file)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(file.link_id)}
                        disabled={isExpired(file)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy {TERMS.link}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setFileToDelete(file.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the {TERMS.file.toLowerCase()} and its{" "}
                              {TERMS.link.toLowerCase()}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setFileToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={deleteFile}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <h3 className="text-lg font-medium mb-2">No {TERMS.file.toLowerCase()}s uploaded yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't uploaded any {TERMS.file.toLowerCase()}s yet. {TERMS.upload} a {TERMS.file.toLowerCase()} to
                get started.
              </p>
              <Button asChild>
                <a href="/upload">
                  {TERMS.upload} a {TERMS.file.toLowerCase()}
                </a>
              </Button>
            </div>
          )}
        </main>

        {/* File Preview Modal */}
        <Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
          <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileIcon className="h-5 w-5" />
                <span className="truncate">{previewFile?.file_name}</span>
              </DialogTitle>
              <DialogDescription>{previewFile && formatFileSize(previewFile.file_size)}</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto min-h-[300px] flex items-center justify-center p-4">
              {isLoadingPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p>Loading preview...</p>
                </div>
              ) : previewUrl ? (
                <>
                  {previewFile && getFileType(previewFile.file_name) === "image" && (
                    <img
                      src={previewUrl || "/placeholder.svg"}
                      alt={previewFile.file_name}
                      className="max-w-full max-h-[60vh] object-contain"
                    />
                  )}
                  {previewFile && getFileType(previewFile.file_name) === "video" && (
                    <video src={previewUrl} controls className="max-w-full max-h-[60vh]">
                      Your browser does not support video playback.
                    </video>
                  )}
                  {previewFile && getFileType(previewFile.file_name) === "audio" && (
                    <audio src={previewUrl} controls className="w-full">
                      Your browser does not support audio playback.
                    </audio>
                  )}
                  {previewFile && getFileType(previewFile.file_name) === "pdf" && (
                    <iframe src={`${previewUrl}#view=FitH`} className="w-full h-[60vh]" title={previewFile.file_name} />
                  )}
                  {previewFile && ["other", "text"].includes(getFileType(previewFile.file_name)) && (
                    <div className="text-center">
                      <p>Preview not available for this file type.</p>
                      <Button asChild className="mt-4">
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                          Open file in new tab
                        </a>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground">Failed to load preview</div>
              )}
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => copyToClipboard(previewFile?.link_id || "")}>
                <Copy className="h-4 w-4 mr-2" />
                Copy {TERMS.link}
              </Button>
              <DialogClose asChild>
                <Button variant="ghost">Close</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
