export type MentorProfile = {
  id: string;
  name: string;
  occupation: string;
  industry: string;
  education: string;
  riasecCode: string;
  availability: "weekdays" | "evenings" | "weekends" | "flexible";
  verified: boolean;
  linkedinUrl?: string;
  bio: string;
  createdAt: Date;
};

export type MentorshipStatus = "pending" | "active" | "completed" | "cancelled";

export type Mentorship = {
  id: string;
  mentorId: string;
  studentUid: string;
  status: MentorshipStatus;
  milestones: {
    intro: { completed: boolean; date?: Date };
    career_chat: { completed: boolean; date?: Date };
    followup: { completed: boolean; date?: Date };
  };
  feedback?: {
    studentRating?: number;
    mentorRating?: number;
    studentComment?: string;
    mentorComment?: string;
  };
  createdAt: Date;
};

export type MatchScore = {
  mentorId: string;
  score: number;
  factors: {
    riasecOverlap: number;
    industryMatch: boolean;
    availabilityMatch: boolean;
  };
};
