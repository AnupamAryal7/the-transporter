"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJoinOrganization } from "@/hooks/use-organization";
import { Loader2, Building, Key } from "lucide-react";

interface JoinOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinOrganizationModal({
  open,
  onOpenChange,
}: JoinOrganizationModalProps) {
  const [secretKey, setSecretKey] = useState("");

  const joinOrganization = useJoinOrganization();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await joinOrganization.mutateAsync({
        secretKey: secretKey.toUpperCase(), // Convert to uppercase for consistency
      });

      // Reset form and close modal on success
      setSecretKey("");
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation
      console.error("Failed to join organization:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!joinOrganization.isPending) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setSecretKey("");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Join Organization
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit organization code to join an existing
              organization.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="secretKey" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Organization Code *
              </Label>
              <Input
                id="secretKey"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code (e.g., ABC123)"
                required
                minLength={6}
                maxLength={6}
                pattern="[A-Z0-9]{6}"
                title="Please enter a 6-digit alphanumeric code"
                disabled={joinOrganization.isPending}
                className="text-center text-lg font-mono tracking-widest uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-character code provided by the organization admin
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={joinOrganization.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={secretKey.length !== 6 || joinOrganization.isPending}
            >
              {joinOrganization.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Joining...
                </>
              ) : (
                "Join Organization"
              )}
            </Button>
          </DialogFooter>
        </form>

        {joinOrganization.isError && (
          <div className="mt-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {joinOrganization.error?.message || "Failed to join organization"}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
