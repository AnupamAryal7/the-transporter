"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileIcon, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface FileTypeStat {
  type: string
  count: number
  totalSize: number
  percentage: number
  sizePercentage: number
}

export function FileTypeStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-file-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/file-stats")
      if (!response.ok) throw new Error("Failed to fetch file statistics")
      return response.json()
    },
    staleTime: 300000, // Data remains fresh for 5 minutes
  })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
    else return (bytes / 1073741824).toFixed(1) + " GB"
  }

  // Get file type icon color based on file type
  const getFileTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      pdf: "bg-red-100 text-red-600",
      doc: "bg-blue-100 text-blue-600",
      docx: "bg-blue-100 text-blue-600",
      xls: "bg-green-100 text-green-600",
      xlsx: "bg-green-100 text-green-600",
      ppt: "bg-orange-100 text-orange-600",
      pptx: "bg-orange-100 text-orange-600",
      jpg: "bg-purple-100 text-purple-600",
      jpeg: "bg-purple-100 text-purple-600",
      png: "bg-purple-100 text-purple-600",
      gif: "bg-purple-100 text-purple-600",
      zip: "bg-gray-100 text-gray-600",
      rar: "bg-gray-100 text-gray-600",
      mp3: "bg-pink-100 text-pink-600",
      mp4: "bg-indigo-100 text-indigo-600",
      txt: "bg-gray-100 text-gray-600",
    }

    return typeColors[type] || "bg-gray-100 text-gray-600"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>File Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>File Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">Failed to load file statistics</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Type Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {data.fileTypeStats.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No files have been uploaded yet</div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">File Types ({data.totalFiles} files)</h3>
              <div className="space-y-4">
                {data.fileTypeStats.slice(0, 10).map((stat: FileTypeStat) => (
                  <div key={stat.type} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Badge className={`mr-2 ${getFileTypeColor(stat.type)}`}>
                          <FileIcon className="h-3 w-3 mr-1" />.{stat.type}
                        </Badge>
                        <span className="text-sm">{stat.count} files</span>
                        <span className="text-xs text-muted-foreground ml-2">({formatFileSize(stat.totalSize)})</span>
                      </div>
                      <span className="text-sm font-medium">{stat.percentage}%</span>
                    </div>
                    <Progress value={stat.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {data.fileTypeStats.length > 10 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Other File Types</h3>
                <div className="flex flex-wrap gap-2">
                  {data.fileTypeStats.slice(10).map((stat: FileTypeStat) => (
                    <Badge key={`other-${stat.type}`} variant="outline" className="flex items-center">
                      <FileIcon className="h-3 w-3 mr-1" />.{stat.type}
                      <span className="ml-1 text-xs">({stat.count})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
