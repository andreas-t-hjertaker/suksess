import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
// Tilgjengelig for bruk i functions som trenger Storage
export const storage = admin.storage();

// ============================================================
// HTTP Functions
// ============================================================

/**
 * Health check / API-status
 */
export const health = onRequest(
  { region: "europe-west1", cors: true },
  (_req, res) => {
    res.json({
      status: "ok",
      project: "ketlcloud",
      timestamp: new Date().toISOString(),
      services: {
        firestore: "connected",
        storage: "connected",
        functions: "running",
      },
    });
  }
);

/**
 * Generisk API-endpoint — utvid med routing etter behov
 */
export const api = onRequest(
  { region: "europe-west1", cors: true },
  async (req, res) => {
    const { method, path } = req;

    if (method === "GET" && path === "/") {
      res.json({ message: "ketl cloud API", version: "0.1.0" });
      return;
    }

    // Eksempel: list collections
    if (method === "GET" && path === "/collections") {
      const collections = await db.listCollections();
      res.json({
        collections: collections.map((c) => c.id),
      });
      return;
    }

    res.status(404).json({ error: "Not found" });
  }
);

// ============================================================
// Firestore Triggers
// ============================================================

/**
 * Trigges når et nytt dokument opprettes i hvilken som helst collection.
 * Perfekt for logging, notifikasjoner, eller agent-pipeliner.
 */
export const onNewDocument = onDocumentCreated(
  { document: "{collection}/{docId}", region: "europe-west1" },
  async (event) => {
    const { collection, docId } = event.params;
    const data = event.data?.data();

    console.log(`[ketl] New document: ${collection}/${docId}`, data);

    // Logg til en audit-collection
    await db.collection("_audit").add({
      type: "document_created",
      collection,
      docId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

// ============================================================
// Storage Triggers
// ============================================================

/**
 * Trigges når en fil er ferdig opplastet til Storage.
 * Kan brukes til å prosessere filer, generere thumbnails, osv.
 */
export const onFileUploaded = onObjectFinalized(
  { region: "europe-west1" },
  async (event) => {
    const { name, contentType, size } = event.data;

    console.log(`[ketl] File uploaded: ${name} (${contentType}, ${size} bytes)`);

    // Logg til Firestore
    await db.collection("_files").add({
      path: name,
      contentType: contentType || "unknown",
      size: size ? Number(size) : 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
