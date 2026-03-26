"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  AlertCircle,
  CircleCheck,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

interface RegistrationResult {
  username: string;
  message: string;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
}

function RegisterContent() {
  const searchParams = useSearchParams();
  const redirectSso = searchParams.get("redirect_sso") === "true";
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [registrationResult, setRegistrationResult] =
    useState<RegistrationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { register } = useAuth();

  const signInHref = redirectSso && clientId && redirectUri && state
    ? `/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
    : "/login";

  const goToLoginHref = redirectSso && clientId && redirectUri && state
    ? `/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
    : "/login";

  function validate(): boolean {
    const errors: FieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
      });
      setRegistrationResult(result);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
        setError(err.message);
      } else if (err instanceof Error) {
        toast.error(err.message);
        setError(err.message);
      } else {
        toast.error("An unexpected error occurred");
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopyUsername() {
    if (!registrationResult) return;
    try {
      await navigator.clipboard.writeText(registrationResult.username);
      setCopied(true);
      toast.success("Username copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy username");
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-sidebar-primary/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-8">
            <Image src="/lgu-seal.png" alt="LGU Quezon" width={56} height={56} />
            <div>
              <h1 className="text-3xl font-bold text-sidebar-foreground">
                LGU-SSO
              </h1>
              <p className="text-sm font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                Single Sign-On
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">
              Employee
              <br />
              <span className="text-sidebar-primary">Registration</span>
            </h2>
            <p className="text-lg text-sidebar-foreground/70 max-w-md">
              Register as an LGU employee to access government applications
              through the Single Sign-On system.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Registration Form / Success */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Image src="/lgu-seal.png" alt="LGU Quezon" width={48} height={48} className="rounded-full" />
            <div>
              <h1 className="text-xl font-bold">LGU-SSO</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Single Sign-On
              </p>
            </div>
          </div>

          {!registrationResult ? (
            <Card className="border-0 shadow-xl shadow-primary/5">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold">
                  Create Account
                </CardTitle>
                <CardDescription>
                  Register as an LGU employee
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Juan"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (fieldErrors.firstName) {
                          setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                        }
                      }}
                      className="h-11"
                      disabled={isLoading}
                      autoComplete="given-name"
                    />
                    {fieldErrors.firstName && (
                      <p className="text-sm text-destructive">
                        {fieldErrors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="middleName" className="text-sm font-medium">
                      Middle Name{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="middleName"
                      type="text"
                      placeholder="Santos"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="h-11"
                      disabled={isLoading}
                      autoComplete="additional-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Dela Cruz"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (fieldErrors.lastName) {
                          setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                        }
                      }}
                      className="h-11"
                      disabled={isLoading}
                      autoComplete="family-name"
                    />
                    {fieldErrors.lastName && (
                      <p className="text-sm text-destructive">
                        {fieldErrors.lastName}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  <p>
                    Already have an account?{" "}
                    <Link
                      href={signInHref}
                      className="font-medium text-primary hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-xl shadow-primary/5">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col items-center text-center space-y-6">
                  {/* Success Icon */}
                  <CircleCheck className="h-14 w-14 text-green-500" />

                  {/* Heading */}
                  <div>
                    <h2 className="text-2xl font-bold">Account Created!</h2>
                  </div>

                  {/* Username Card */}
                  <div className="w-full bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Username
                        </p>
                        <p className="font-mono text-lg">
                          {registrationResult.username}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyUsername}
                        className="shrink-0"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Password Hint */}
                  <div className="w-full bg-muted rounded-lg p-4 text-left">
                    <p className="text-sm text-muted-foreground">
                      Your default password is your first initial + full last
                      name (e.g.,{" "}
                      <span className="font-mono font-medium text-foreground">
                        jdoe
                      </span>
                      )
                    </p>
                  </div>

                  {/* Warning */}
                  <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-500">
                        You&apos;ll be asked to change your password on first
                        login.
                      </p>
                    </div>
                  </div>

                  {/* Go to Login Button */}
                  <Link href={goToLoginHref} className="w-full">
                    <Button className="w-full h-11 text-base font-semibold">
                      Go to Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Local Government of Quezon Bukidnon. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
