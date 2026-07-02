import { StyleSheet, Text, View } from "react-native";

export default function CustomerSearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>음식점 검색</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 24, fontWeight: "700" },
});
