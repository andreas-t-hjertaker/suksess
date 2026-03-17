// Delte typer for hele prosjektet

/** Standard API-respons fra Cloud Functions */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Brukertype som speiler Firebase Auth-felter */
export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};

/** Legg til id-felt på en type */
export type WithId<T> = T & { id: string };

/** Legg til tidsstempler */
export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

/** Standard Firestore-dokument med id og tidsstempler */
export type FirestoreDoc = WithId<WithTimestamps<Record<string, unknown>>>;

/** Stripe abonnement-status */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

/** Prisplan-definisjon */
export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  stripePriceId: string;
  highlighted?: boolean;
};

/** Brukerens abonnement lagret i Firestore */
export type UserSubscription = {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: SubscriptionStatus | "none";
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

/** API-nøkkel lagret i Firestore */
export type ApiKey = {
  id: string;
  name: string;
  prefix: string;         // Første 8 tegn, for visning: "sk_live_abc..."
  hashedKey: string;       // SHA-256 hash av full nøkkel
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
};
