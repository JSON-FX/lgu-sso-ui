"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Trash2,
  Key,
  Users,
  AppWindow,
  Link2,
  Gauge,
  Plus,
  X,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { Application, UpdateApplicationData, ApplicationEmployee } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uuid = params.uuid as string;

  const [application, setApplication] = useState<Application | null>(null);
  const [employees, setEmployees] = useState<ApplicationEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UpdateApplicationData>({});

  useEffect(() => {
    async function loadApplication() {
      try {
        const appResponse = await api.applications.get(uuid);
        setApplication(appResponse.data);
        setFormData({
          name: appResponse.data.name,
          description: appResponse.data.description || "",
          redirect_uris: appResponse.data.redirect_uris,
          rate_limit_per_minute: appResponse.data.rate_limit_per_minute,
          is_active: appResponse.data.is_active,
        });

        // Employees endpoint is optional - may not exist in backend yet
        try {
          const employeesResponse = await api.applications.getEmployees(uuid);
          setEmployees(employeesResponse.data);
        } catch {
          // Employees endpoint not available, continue without it
        }
      } catch (error) {
        console.error("Failed to load application:", error);
        toast.error("Failed to load application details");
      } finally {
        setIsLoading(false);
      }
    }

    loadApplication();
  }, [uuid]);

  const addRedirectUri = () => {
    setFormData({
      ...formData,
      redirect_uris: [...(formData.redirect_uris || []), ""],
    });
  };

  const removeRedirectUri = (index: number) => {
    if (formData.redirect_uris && formData.redirect_uris.length > 1) {
      const newUris = formData.redirect_uris.filter((_, i) => i !== index);
      setFormData({ ...formData, redirect_uris: newUris });
    }
  };

  const updateRedirectUri = (index: number, value: string) => {
    if (formData.redirect_uris) {
      const newUris = [...formData.redirect_uris];
      newUris[index] = value;
      setFormData({ ...formData, redirect_uris: newUris });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanedData = {
        ...formData,
        redirect_uris: formData.redirect_uris?.filter((uri) => uri.trim() !== ""),
      };
      const response = await api.applications.update(uuid, cleanedData);
      setApplication(response.data);
      toast.success("Application updated successfully");
    } catch (error) {
      toast.error("Failed to update application");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.applications.delete(uuid);
      toast.success("Application deleted successfully");
      router.push("/applications");
    } catch (error) {
      toast.error("Failed to delete application");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleRegenerateSecret = async () => {
    setIsRegenerating(true);
    try {
      const response = await api.applications.regenerateSecret(uuid);
      setNewSecret(response.data.client_secret);
      setRegenerateDialogOpen(false);
      setSecretDialogOpen(true);
      toast.success("Client secret regenerated");
    } catch (error) {
      toast.error("Failed to regenerate secret");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopySecret = () => {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Secret copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Application not found</p>
        <Button variant="link" asChild>
          <Link href="/applications">Back to applications</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/applications">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent/30">
              <AppWindow className="h-8 w-8 text-accent-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{application.name}</h1>
                <Badge
                  variant={application.is_active ? "default" : "secondary"}
                  className={
                    application.is_active
                      ? "bg-green-500/10 text-green-700"
                      : "bg-gray-500/10 text-gray-600"
                  }
                >
                  {application.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono text-sm">{application.client_id}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/applications/${uuid}/employees`}>
              <Users className="mr-2 h-4 w-4" />
              Manage Employees
            </Link>
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Application</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {application.name}? This will revoke all employee
                  access and cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="employees">Employees ({employees.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AppWindow className="h-5 w-5" />
                Application Details
              </CardTitle>
              <CardDescription>Basic information about your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Application Name</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={formData.is_active ? "active" : "inactive"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, is_active: value === "active" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of your application"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Redirect URIs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Redirect URIs
              </CardTitle>
              <CardDescription>Allowed callback URLs for OAuth authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.redirect_uris?.map((uri, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={uri}
                    onChange={(e) => updateRedirectUri(index, e.target.value)}
                    placeholder="https://myapp.example.com/callback"
                  />
                  {formData.redirect_uris && formData.redirect_uris.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRedirectUri(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addRedirectUri}>
                <Plus className="mr-2 h-4 w-4" />
                Add URI
              </Button>
            </CardContent>
          </Card>

          {/* Rate Limiting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Rate Limiting
              </CardTitle>
              <CardDescription>Configure API rate limits for this application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="rate_limit">Requests per Minute</Label>
                <Input
                  id="rate_limit"
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.rate_limit_per_minute || 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rate_limit_per_minute: parseInt(e.target.value) || 60,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of API requests allowed per minute (1-1000)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6">
          {/* Client Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Client Credentials
              </CardTitle>
              <CardDescription>
                OAuth 2.0 credentials for authenticating your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted p-3 text-sm font-mono">
                    {application.client_id}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(application.client_id);
                      toast.success("Client ID copied");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Client Secret</Label>
                <div className="rounded-lg border border-dashed border-muted-foreground/25 p-4">
                  <p className="text-sm text-muted-foreground">
                    The client secret is only shown once when created or regenerated. If you&apos;ve
                    lost it, you can regenerate a new one below.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg bg-destructive/5 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Regenerate Secret</p>
                  <p className="text-sm text-muted-foreground">
                    This will invalidate the current secret and break any integrations using it.
                  </p>
                </div>
                <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Regenerate Client Secret?</DialogTitle>
                      <DialogDescription>
                        This will immediately invalidate the current client secret. Any applications
                        using this secret will stop working until updated.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleRegenerateSecret}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          "Regenerate Secret"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                  <dd className="text-sm">
                    {format(new Date(application.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                  <dd className="text-sm">
                    {format(new Date(application.updated_at), "MMMM d, yyyy 'at' h:mm a")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">UUID</dt>
                  <dd className="text-sm font-mono">{application.uuid}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Rate Limit</dt>
                  <dd className="text-sm">{application.rate_limit_per_minute} requests/minute</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Employee Access</CardTitle>
                <CardDescription>Employees who have access to this application</CardDescription>
              </div>
              <Button asChild>
                <Link href={`/applications/${uuid}/employees`}>Manage Access</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {employees.length > 0 ? (
                <div className="space-y-3">
                  {employees.map((emp) => (
                    <div
                      key={emp.uuid}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {emp.initials}
                        </div>
                        <div>
                          <p className="font-medium">{emp.full_name}</p>
                          <p className="text-sm text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {emp.role.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No employees have access to this application yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Secret Dialog */}
      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              New Client Secret
            </DialogTitle>
            <DialogDescription>
              This is the only time the client secret will be displayed. Please copy and store it
              securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <div className="relative">
                <code className="block w-full rounded-md bg-destructive/10 p-3 pr-12 text-sm font-mono break-all text-destructive">
                  {newSecret}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={handleCopySecret}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-destructive font-medium">
                Warning: This secret will not be shown again!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSecretDialogOpen(false)}>I&apos;ve saved the secret</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
