import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileEditor } from "@/components/ProfileEditor";

export default function OwnerProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <ProfileEditor />
    </SafeAreaView>
  );
}
