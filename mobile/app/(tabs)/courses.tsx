import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import type { MobileCourse } from "@learnloop/types";

export default function CoursesScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<MobileCourse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { courses } = await api.getCourses();
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

  return (
    <SafeAreaView className="flex-1 bg-bg-50" edges={["top"]}>
      <View className="border-b border-zinc-200 bg-white px-5 py-4">
        <Text className="text-xs uppercase tracking-wider text-text-500">
          Enrolled
        </Text>
        <Text className="text-2xl font-bold text-text-900">Courses</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Text className="text-text-500">Loading…</Text>
        ) : courses.length === 0 ? (
          <View className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-6">
            <Text className="text-center text-text-500">No enrollments yet.</Text>
          </View>
        ) : (
          courses.map((course) => {
            const completed = course.lessons.filter((l) => l.completed).length;
            const total = course.lessons.length;
            const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
            return (
              <View key={course.id} className="mb-6 rounded-2xl bg-white p-4">
                <Text className="text-xs uppercase tracking-wider text-brand-700">
                  {course.enrollmentStatus}
                </Text>
                <Text className="mt-1 text-lg font-bold text-text-900">
                  {course.title}
                </Text>
                {course.description && (
                  <Text className="mt-1 text-sm text-text-500">{course.description}</Text>
                )}

                <View className="mt-3 flex-row items-center gap-3">
                  <View className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <View className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </View>
                  <Text className="text-xs text-text-500">
                    {completed} / {total}
                  </Text>
                </View>

                <View className="mt-4 gap-2">
                  {course.lessons.map((l) => (
                    <Pressable
                      key={l.id}
                      onPress={() => l.unlocked && router.push(`/lesson/${l.id}`)}
                      disabled={!l.unlocked}
                      className="flex-row items-center gap-3 rounded-xl border border-zinc-100 p-3"
                    >
                      <View
                        className={`h-8 w-8 items-center justify-center rounded-full ${
                          l.completed ? "bg-brand-500" : l.unlocked ? "bg-zinc-200" : "bg-zinc-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            l.completed ? "text-white" : "text-text-700"
                          }`}
                        >
                          {l.completed ? "✓" : l.unlocked ? l.order : "🔒"}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-medium ${l.unlocked ? "text-text-900" : "text-text-500"}`}
                        >
                          {l.title}
                        </Text>
                        <Text className="text-xs text-text-500">
                          {l.unlocked ? `+${l.xpReward} XP` : (l.lockReason ?? "Locked")}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
