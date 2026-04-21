import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const router = useRouter();
  const { state } = useAuth();

  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "authenticated") {
      router.replace("/(tabs)/home");
    } else {
      router.replace("/signin");
    }
  }, [state.status, router]);

  return (
    <View className="flex-1 items-center justify-center bg-bg-50">
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );
}
