"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Plus, AppWindow, Link2, Gauge, X, Copy, Check, AlertTriangle } from "lucide-react";
import { mockApplicationApi } from "@/lib/mock";
import { CreateApplicationData, ApplicationWithSecret } from "@/types";
import { toast } from "sonner";

export default function NewApplicationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdApp, setCreatedApp] = useState<ApplicationWithSecret | null>(null);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<CreateApplicationData>({
    name: "",
    description: "",
    redirect_uris: [""],
    rate_limit_per_minute: 60,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const addRedirectUri = () => {
    setFormData({
      ...formData,
      redirect_uris: [...formData.redirect_uris, ""],
    });
  };

  const removeRedirectUri = (index: number) => {
    if (formData.redirect_uris.length > 1) {
      const newUris = formData.redirect_uris.filter((_, i) => i !== index);
      setFormData({ ...formData, redirect_uris: newUris });
    }
  };

  const updateRedirectUri = (index: number, value: string) => {
    const newUris = [...formData.redirect_uris];
    newUris[index] = value;
    setFormData({ ...formData, redirect_uris: newUris });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = "Application name must be at least 2 characters";
    }

    const validUris = formData.redirect_uris.filter((uri) => uri.trim() !== "");
    if (validUris.length === 0) {
      newErrors.redirect_uris = "At least one redirect URI is required";
    } else {
      const invalidUri = validUris.find((uri) => {
        try {
          new URL(uri);
          return false;
        } catch {
          return true;
        }
      });
      if (invalidUri) {
        newErrors.redirect_uris = "Please enter valid URLs";
      }
    }

    if (formData.rate_limit_per_minute < 1 || formData.rate_limit_per_minute > 1000) {
      newErrors.rate_limit_per_minute = "Rate limit must be between 1 and 1000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanedData = {
        ...formData,
        redirect_uris: formData.redirect_uris.filter((uri) => uri.trim() !== ""),
      };
      const response = await mockApplicationApi.create(cleanedData);
      setCreatedApp(response.data);
      setSecretDialogOpen(true);
      toast.success("Application created successfully");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create application");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySecret = () => {
    if (createdApp?.client_secret) {
      navigator.clipboard.writeText(createdApp.client_secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Secret copied to clipboard");
    }
  };

  const handleCloseSecretDialog = () => {
    setSecretDialogOpen(false);
    if (createdApp) {
      router.push(`/applications/${createdApp.uuid}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/applications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Register New Application</h1>
          <p className="text-muted-foreground">Create a new SSO client application</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="space-y-2">
              <Label htmlFor="name">
                Application Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? "border-destructive" : ""}
                placeholder="My Application"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
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
            <CardDescription>
              Allowed callback URLs for OAuth authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.redirect_uris.map((uri, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={uri}
                  onChange={(e) => updateRedirectUri(index, e.target.value)}
                  placeholder="https://myapp.example.com/callback"
                  className={errors.redirect_uris ? "border-destructive" : ""}
                />
                {formData.redirect_uris.length > 1 && (
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
            {errors.redirect_uris && (
              <p className="text-xs text-destructive">{errors.redirect_uris}</p>
            )}
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
              <Label htmlFor="rate_limit">
                Requests per Minute <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rate_limit"
                type="number"
                min={1}
                max={1000}
                value={formData.rate_limit_per_minute}
                onChange={(e) =>
                  setFormData({ ...formData, rate_limit_per_minute: parseInt(e.target.value) || 60 })
                }
                className={errors.rate_limit_per_minute ? "border-destructive" : ""}
              />
              {errors.rate_limit_per_minute && (
                <p className="text-xs text-destructive">{errors.rate_limit_per_minute}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum number of API requests allowed per minute (1-1000)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/applications">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Application
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Secret Dialog */}
      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Client Secret Created
            </DialogTitle>
            <DialogDescription>
              This is the only time the client secret will be displayed. Please copy and store it
              securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <code className="block w-full rounded-md bg-muted p-3 text-sm font-mono break-all">
                {createdApp?.client_id}
              </code>
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <div className="relative">
                <code className="block w-full rounded-md bg-destructive/10 p-3 pr-12 text-sm font-mono break-all text-destructive">
                  {createdApp?.client_secret}
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
            <Button onClick={handleCloseSecretDialog}>I&apos;ve saved the secret</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
