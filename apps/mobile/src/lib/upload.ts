import * as ImagePicker from "expo-image-picker";
import { api } from "./axios";

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
// Multer-backed /uploads endpoint. Returns the public URL, or null if
// the user cancelled or denied permission.
export async function pickAndUploadImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const filename = asset.fileName ?? `photo-${Date.now()}.jpg`;

  const formData = new FormData();
  formData.append("file", {
    uri: asset.uri,
    name: filename,
    type: guessMimeType(filename),
  } as unknown as Blob);

  const { data } = await api.post<{ url: string }>("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.url;
}
