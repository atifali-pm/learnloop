import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { CoursesResponse, MobileCourse } from "@learnloop/types";

export default function HomeScreen() {
  const { state, refresh } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<MobileCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { courses: next } = await api.getCourses();
    setCourses(next);
  }, []);

  useEffect(() => {
    if (state.status !== "authenticated") return;
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [state.status, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), load()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, load]);

  if (state.status !== "authenticated") return null;
  const { user, stats } = state;

  const xpPct =
    stats.xpIntoLevel + stats.xpToNext === 0
      ? 0
      : Math.round((stats.xpIntoLevel / (stats.xpIntoLevel + stats.xpToNext)) * 100);

  const firstCourse = courses[0];
  const nextLesson = firstCourse?.lessons.find((l) => l.id === firstCourse.nextLessonId);

  return (
    <SafeAreaView className="flex-1 bg-bg-50" edges={["top"]}>
      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="text-xs uppercase tracking-wider text-text-500">
          Welcome back
        </Text>
        <Text className="mt-1 text-2xl font-bold text-text-900">
          {user.name ?? user.email}
        </Text>

        <View className="mt-6 flex-row gap-3">
          <StatCard label="Streak" value={`${stats.currentStreak}🔥`} sub={`Best ${stats.longestStreak}`} />
          <StatCard label="Level" value={`L${stats.level}`} sub={`${stats.totalXp} XP`} />
          <StatCard label="Badges" value={String(stats.badgeCount)} sub="earned" />
        </View>

        <View className="mt-6 rounded-2xl bg-white p-4">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-sm font-semibold text-text-900">
              Level {stats.level} → {stats.level + 1}
            </Text>
            <Text className="text-xs text-text-500">
              {stats.xpIntoLevel} / {stats.xpIntoLevel + stats.xpToNext} XP
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
            <View className="h-full bg-brand-500" style={{ width: `${xpPct}%` }} />
          </View>
        </View>

        {loading ? (
          <View className="mt-10 items-center">
            <Text className="text-text-500">Loading courses…</Text>
          </View>
        ) : nextLesson && firstCourse ? (
          <Pressable
            onPress={() => router.push(`/lesson/${nextLesson.id}`)}
            className="mt-6 rounded-2xl bg-brand-600 p-5 active:opacity-90"
          >
            <Text className="text-xs uppercase tracking-wider text-brand-100">
              Next up · {firstCourse.title}
            </Text>
            <Text className="mt-1 text-xl font-bold text-white">{nextLesson.title}</Text>
            <Text className="mt-1 text-sm text-brand-50">
              +{nextLesson.xpReward} XP · tap to open
            </Text>
          </Pressable>
        ) : (
          <View className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-6">
            <Text className="text-center text-text-500">
              No next lesson. All caught up!
            </Text>
          </View>
        )}

        {firstCourse && (
          <View className="mt-6">
            <Text className="mb-3 text-base font-semibold text-text-900">
              {firstCourse.title}
            </Text>
            <View className="gap-2">
              {firstCourse.lessons.slice(0, 5).map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => l.unlocked && router.push(`/lesson/${l.id}`)}
                  disabled={!l.unlocked}
                  className="flex-row items-center gap-3 rounded-xl bg-white p-3"
                >
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-full ${
                      l.completed
                        ? "bg-brand-500"
                        : l.unlocked
                          ? "bg-zinc-200"
                          : "bg-zinc-100"
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
                    <Text className={`text-sm font-medium ${l.unlocked ? "text-text-900" : "text-text-500"}`}>
                      {l.title}
                    </Text>
                    <Text className="text-xs text-text-500">
                      {l.unlocked ? `+${l.xpReward} XP` : (l.lockReason ?? "Locked")}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => router.push("/(tabs)/courses")}
              className="mt-3 items-center rounded-xl border border-zinc-200 py-2"
            >
              <Text className="text-sm font-medium text-brand-700">
                See all {firstCourse.lessons.length} lessons
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-white p-3">
      <Text className="text-xs uppercase tracking-wider text-text-500">{label}</Text>
      <Text className="mt-1 text-xl font-bold text-text-900">{value}</Text>
      <Text className="text-xs text-text-500" numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}
