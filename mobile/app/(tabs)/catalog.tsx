import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import type { CatalogCourse } from "@learnloop/types";

export default function CatalogScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { courses } = await api.getCatalog();
    setCourses(courses);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    setError(null);
    try {
      await api.enroll(courseId);
      router.push("/(tabs)/courses");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't enroll.");
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-50" edges={["top"]}>
      <View className="border-b border-zinc-200 bg-white px-5 py-4">
        <Text className="text-xs uppercase tracking-wider text-text-500">Browse</Text>
        <Text className="text-2xl font-bold text-text-900">Catalog</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error && (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

        {loading ? (
          <Text className="text-text-500">Loading…</Text>
        ) : courses.length === 0 ? (
          <View className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-6">
            <Text className="text-center text-text-500">
              You&apos;re enrolled in every published course.
            </Text>
          </View>
        ) : (
          courses.map((c) => (
            <View key={c.id} className="mb-4 rounded-2xl bg-white p-4">
              <Text className="text-lg font-bold text-text-900">{c.title}</Text>
              {c.description && (
                <Text className="mt-1 text-sm text-text-500">{c.description}</Text>
              )}
              <Text className="mt-2 text-xs text-text-500">
                {c.lessonCount} lessons · up to {c.totalXp} XP
              </Text>
              <Pressable
                onPress={() => onEnroll(c.id)}
                disabled={enrollingId === c.id}
                className="mt-3 items-center rounded-xl bg-brand-600 py-2.5 active:opacity-90 disabled:opacity-60"
              >
                <Text className="text-sm font-semibold text-white">
                  {enrollingId === c.id ? "Enrolling…" : "Enroll"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
