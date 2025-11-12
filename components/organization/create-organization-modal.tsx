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
import { Textarea } from "@/components/ui/textarea";
import { useCreateOrganization } from "@/hooks/use-organization";
import { Loader2, Building } from "lucide-react";

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationModal({
  open,
  onOpenChange,
}: CreateOrganizationModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(10);

  const createOrganization = useCreateOrganization();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createOrganization.mutateAsync({
        name,
        description,
        maxMembers,
      });

      // Reset form and close modal on success
      setName("");
      setDescription("");
      setMaxMembers(10);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation
      console.error("Failed to create organization:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!createOrganization.isPending) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setName("");
        setDescription("");
        setMaxMembers(10);
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
              Create Organization
            </DialogTitle>
            <DialogDescription>
              Create a new organization to collaborate with your team. You'll be
              the admin of this organization.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organization name"
                required
                minLength={2}
                maxLength={50}
                disabled={createOrganization.isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your organization"
                rows={3}
                maxLength={200}
                disabled={createOrganization.isPending}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/200 characters
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxMembers">Maximum Members *</Label>
              <Input
                id="maxMembers"
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                min={2}
                max={100}
                required
                disabled={createOrganization.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Set the maximum number of members allowed in your organization
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createOrganization.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name || maxMembers < 2 || createOrganization.isPending}
            >
              {createOrganization.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </DialogFooter>
        </form>

        {createOrganization.isError && (
          <div className="mt-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {createOrganization.error?.message ||
              "Failed to create organization"}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
