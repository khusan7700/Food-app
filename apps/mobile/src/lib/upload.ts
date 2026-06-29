import * as ImagePicker from "expo-image-picker";
import { api } from "./axios";

export type UploadType = "user" | "restaurant" | "menu-item";

function guessMimeType(filename: string): string {
  const match = /\.(\w+)$/.exec(filename);
  const ext = match?.[1]?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

// Picks an image from the library and uploads it to the backend's
// Multer-backed /uploads/:type endpoint. Returns the public URL, or null
// if the user cancelled or denied permission. If onPicked is given, it
// fires with the local file URI as soon as the image is picked, so the
// caller can show a preview immediately instead of waiting for the upload.
//
// For type "user" and "restaurant" (when the restaurant already exists),
// the backend attaches the URL to the owning record itself — no follow-up
// PATCH is needed. For type "menu-item" the caller must still include the
// returned URL in the create/update request body.
export async function pickAndUploadImage(
  type: UploadType,
  onPicked?: (localUri: string) => void,
): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  onPicked?.(asset.uri);

  const filename = asset.fileName ?? `photo-${Date.now()}.jpg`;

  const formData = new FormData();
  if (asset.file) {
    // Web: expo-image-picker exposes the real File object here. asset.uri
    // is a blob: URL on web, which FormData can't upload as-is.
    formData.append("file", asset.file, filename);
  } else {
    formData.append("file", {
      uri: asset.uri,
      name: filename,
      type: asset.mimeType ?? guessMimeType(filename),
    } as unknown as Blob);
  }

  const { data } = await api.post<{ url: string }>(
    `/uploads/${type}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return data.url;
}
