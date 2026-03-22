export { app } from "./config";
export {
  db,
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  subscribeToCollection,
  subscribeToDocument,
  getCollectionPaginated,
  batchWrite,
} from "./firestore";
export { storage, uploadFile, uploadFileWithProgress, getFileURL, deleteFile, listFiles } from "./storage";
export { trackEvent, trackPageView } from "./analytics";
export { getModel, generateText, streamText, createChat } from "./ai";
export {
  auth,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  resetPassword,
  onAuthChange,
  signInAnonymous,
  sendEmailLink,
  isEmailLink,
  completeEmailLinkSignIn,
} from "./auth";
export { fetchApi, apiGet, apiPost, apiPut, apiDelete } from "../api-client";
export {
  getUserDoc,
  createUserDoc,
  updateUserDoc,
  subscribeToUserDoc,
  getUserProfile,
  saveUserProfile,
  subscribeToUserProfile,
  saveTestResult,
  saveGrade,
  updateGrade,
  saveConversation,
} from "./profiles";
