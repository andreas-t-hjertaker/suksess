export type EmployerProfile = {
  id: string;
  name: string;
  orgNr: string;
  logo?: string;
  industry: string;
  description: string;
  website?: string;
  verified: boolean;
  contactEmail: string;
  createdAt: Date;
};

export type ListingType = "laerling" | "sommerjobb" | "trainee" | "deltid";

export type JobListing = {
  id: string;
  employerId: string;
  title: string;
  type: ListingType;
  riasecCodes: string[];
  location: string;
  description: string;
  requirements: string[];
  deadline?: Date;
  status: "draft" | "active" | "closed";
  createdAt: Date;
};

export type JobApplication = {
  id: string;
  studentUid: string;
  listingId: string;
  employerId: string;
  status: "submitted" | "reviewed" | "accepted" | "rejected";
  moderatedBy?: string;
  createdAt: Date;
};
