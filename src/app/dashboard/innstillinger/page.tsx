"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateProfile,
  linkWithPopup,
  unlink,
  GoogleAuthProvider,
  deleteUser,
} from "firebase/auth";
import { useAuth } from "@/hooks/use-auth";
import { uploadFile } from "@/lib/firebase/storage";
import { apiDelete } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { showToast } from "@/lib/toast";
import { Loader2, Upload, Lock, Link2, Unlink, Trash2, Globe, Bell } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

// ─── Profil-skjema ──────────────────────────────────────────
const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Navnet må være minst 2 tegn")
    .max(50, "Navnet kan ikke være lengre enn 50 tegn"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ─── Passord-skjema ─────────────────────────────────────────
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nåværende passord er påkrevd"),
    newPassword: z.string().min(6, "Nytt passord må være minst 6 tegn"),
    confirmPassword: z.string().min(1, "Bekreft passord er påkrevd"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passordene stemmer ikke overens",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

// ---------------------------------------------------------------------------
// Varsel-innstillinger
// ---------------------------------------------------------------------------

type NotifPrefs = {
  inApp: boolean;
  emailDeadlines: boolean;
  emailCareerSuggestions: boolean;
  emailCounselorContact: boolean;
  pushEnabled: boolean;
};

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  inApp: true,
  emailDeadlines: true,
  emailCareerSuggestions: false,
  emailCounselorContact: true,
  pushEnabled: false,
};

async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export default function InnstillingerPage() {
  const { user, firebaseUser } = useAuth();
  const { locale, setLocale, locales } = useLocale();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [notifSaving, setNotifSaving] = useState(false);

  // Last varselinnstillinger fra Firestore
  useState(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid, "prefs", "notifications"))
      .then((snap) => {
        if (snap.exists()) {
          setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...(snap.data() as Partial<NotifPrefs>) });
        }
      })
      .catch(() => {});
  });

  async function saveNotifPrefs(updated: NotifPrefs) {
    if (!user) return;
    setNotifSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid, "prefs", "notifications"), updated).catch(
        async () => {
          // Dokument finnes ikke ennå — bruk set via updateDoc fallback
          const { setDoc } = await import("firebase/firestore");
          await setDoc(doc(db, "users", user.uid, "prefs", "notifications"), updated);
        }
      );
      setNotifPrefs(updated);
      showToast.success("Varselinnstillinger lagret");
    } catch {
      showToast.error("Kunne ikke lagre innstillinger");
    } finally {
      setNotifSaving(false);
    }
  }

  async function handleToggle(key: keyof NotifPrefs, value: boolean) {
    if (key === "pushEnabled" && value) {
      const granted = await requestPushPermission();
      if (!granted) {
        showToast.error("Push-varsler ble avslått av nettleseren");
        return;
      }
    }
    const updated = { ...notifPrefs, [key]: value };
    await saveNotifPrefs(updated);
  }

  const hasPasswordProvider = firebaseUser?.providerData.some(
    (p) => p.providerId === "password"
  );
  const hasGoogleProvider = firebaseUser?.providerData.some(
    (p) => p.providerId === "google.com"
  );

  // ─── Profil ─────────────────────────────────────────────
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
    },
  });

  async function onProfileSubmit(data: ProfileFormValues) {
    if (!firebaseUser) return;
    try {
      await updateProfile(firebaseUser, { displayName: data.displayName });
      showToast.success("Profil oppdatert");
    } catch {
      showToast.error("Kunne ikke oppdatere profil");
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;

    if (!file.type.startsWith("image/")) {
      showToast.error("Kun bildefiler er tillatt");
      return;
    }

    setAvatarUploading(true);
    try {
      const { url } = await uploadFile(`avatars/${firebaseUser.uid}`, file);
      await updateProfile(firebaseUser, { photoURL: url });
      showToast.success("Profilbilde oppdatert");
    } catch {
      showToast.error("Kunne ikke laste opp bilde");
    }
    setAvatarUploading(false);
  }

  // ─── Passord ────────────────────────────────────────────
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onPasswordSubmit(data: PasswordFormValues) {
    if (!firebaseUser || !firebaseUser.email) return;
    try {
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        data.currentPassword
      );
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, data.newPassword);
      passwordForm.reset();
      showToast.success("Passord endret");
    } catch {
      showToast.error("Feil passord eller noe gikk galt");
    }
  }

  // ─── Google-kobling ─────────────────────────────────────
  async function handleLinkGoogle() {
    if (!firebaseUser) return;
    setLinkingGoogle(true);
    try {
      await linkWithPopup(firebaseUser, new GoogleAuthProvider());
      showToast.success("Google-konto koblet til");
    } catch {
      showToast.error("Kunne ikke koble til Google");
    }
    setLinkingGoogle(false);
  }

  async function handleUnlinkGoogle() {
    if (!firebaseUser) return;
    if (firebaseUser.providerData.length <= 1) {
      showToast.error("Du må ha minst én innloggingsmetode");
      return;
    }
    setLinkingGoogle(true);
    try {
      await unlink(firebaseUser, "google.com");
      showToast.success("Google-konto frakoblet");
    } catch {
      showToast.error("Kunne ikke frakoble Google");
    }
    setLinkingGoogle(false);
  }

  // ─── Slett konto ────────────────────────────────────────
  async function handleDeleteAccount() {
    if (deleteConfirm !== "SLETT" || !firebaseUser) return;
    setDeleting(true);
    try {
      await apiDelete("/account");
      await deleteUser(firebaseUser);
      showToast.success("Kontoen din er slettet");
    } catch {
      showToast.error(
        "Kunne ikke slette konto. Du kan trenge å logge inn på nytt."
      );
    }
    setDeleting(false);
  }

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Innstillinger</h1>
        <p className="text-muted-foreground">
          Administrer profil, sikkerhet og kontoinnstillinger.
        </p>
      </div>

      {/* Profil-kort */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Oppdater visningsnavn og profilbilde.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={firebaseUser?.photoURL || undefined}
                alt={user?.displayName || "Bruker"}
              />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Last opp bilde
              </Button>
            </div>
          </div>

          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="space-y-4"
            >
              <FormField
                control={profileForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visningsnavn</FormLabel>
                    <FormControl>
                      <Input placeholder="Ditt navn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">E-post</label>
                <Input value={user?.email || ""} disabled />
              </div>

              <Button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
              >
                {profileForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Lagre profil
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Sikkerhet-kort */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Sikkerhet</CardTitle>
          <CardDescription>
            Administrer passord og tilkoblede kontoer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasPasswordProvider && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4" />
                Endre passord
              </h3>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nåværende passord</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nytt passord</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bekreft nytt passord</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={passwordForm.formState.isSubmitting}
                  >
                    {passwordForm.formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Endre passord
                  </Button>
                </form>
              </Form>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Tilkoblede kontoer</h3>
            <div className="space-y-2">
              {firebaseUser?.providerData.map((provider) => (
                <div
                  key={provider.providerId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{provider.providerId}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {provider.email || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {hasGoogleProvider ? (
              <Button
                variant="outline"
                onClick={handleUnlinkGoogle}
                disabled={linkingGoogle}
              >
                {linkingGoogle ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-4 w-4" />
                )}
                Frakoble Google
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleLinkGoogle}
                disabled={linkingGoogle}
              >
                {linkingGoogle ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Koble til Google
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Språk-kort */}
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle>Språk</CardTitle>
          </div>
          <CardDescription>
            Velg visningsspråk for plattformen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {locales.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLocale(l.code);
                  showToast.success(`Språk endret til ${l.nativeName}`);
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  locale === l.code
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
                aria-pressed={locale === l.code}
              >
                {l.nativeName}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Valgt språk huskes mellom sesjoner. AI-innhold genereres på valgt språk.
          </p>
        </CardContent>
      </Card>

      {/* Varsel-innstillinger */}
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle>Varsler</CardTitle>
          </div>
          <CardDescription>
            Velg hvilke varsler du ønsker å motta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {([
            { key: "inApp" as const, label: "In-app varsler", sub: "Varsler i klokke-ikonet øverst i appen" },
            { key: "emailDeadlines" as const, label: "Søknadsfrister på e-post", sub: "Påminnelse 7 og 1 dag før frister" },
            { key: "emailCareerSuggestions" as const, label: "Karriereforslag på e-post", sub: "Ukentlige karriereforslag basert på profilen din" },
            { key: "emailCounselorContact" as const, label: "Rådgiverkontakt på e-post", sub: "Varsel når rådgiver sender deg en melding" },
            { key: "pushEnabled" as const, label: "Push-varsler (PWA)", sub: "Varsler som pop-up når appen er lukket" },
          ] as const).map(({ key, label, sub }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
              <button
                role="switch"
                aria-checked={notifPrefs[key]}
                disabled={notifSaving}
                onClick={() => handleToggle(key, !notifPrefs[key])}
                className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                  notifPrefs[key] ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    notifPrefs[key] ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Faresone-kort */}
      <Card className="max-w-2xl border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Faresone</CardTitle>
          <CardDescription>
            Irreversible handlinger som påvirker kontoen din.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sletting av kontoen din fjerner alle data permanent, inkludert
            abonnementer, API-nøkler og dokumenter. Denne handlingen kan ikke
            angres.
          </p>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Skriv SLETT for å bekrefte"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="max-w-xs"
            />
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "SLETT" || deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Slett konto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
