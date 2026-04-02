export type FeedbackRating = "thumbs_up" | "thumbs_down";
export type FeedbackReason =
  | "wrong_info"
  | "not_relevant"
  | "unclear"
  | "other";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
  feedback?: FeedbackRating | null;
  feedbackReason?: FeedbackReason | null;
};

export type AssistantContext = {
  user?: { displayName: string | null; email: string | null; uid: string };
  appName: string;
  currentPath: string;
  customContext?: string;
};

export type ChatConfig = {
  modelName?: string;
  systemPrompt?: string;
  contextProvider?: () => AssistantContext;
  welcomeMessage?: string;
  placeholder?: string;
  title?: string;
  position?: "bottom-right" | "bottom-left";
};
