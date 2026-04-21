import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CompleteLessonResponse, MobileCourse, MobileLesson } from "@learnloop/types";

type RewardToast = {
  xp: number;
  streak: number;
  badges: number;
};

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh } = useAuth();

  const [lesson, setLesson] = useState<MobileLesson | null>(null);
  const [course, setCourse] = useState<MobileCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reward, setReward] = useState<RewardToast | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { courses } = await api.getCourses();
    for (const c of courses) {
      const found = c.lessons.find((l) => l.id === id);
      if (found) {
        setCourse(c);
        setLesson(found);
        return;
      }
    }
    setError("Lesson not found.");
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch {
        setError("Failed to load lesson.");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onComplete = async () => {
    if (!lesson) return;
    setSubmitting(true);
    setError(null);
    try {
      const result: CompleteLessonResponse = await api.completeLesson(lesson.id);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setReward({
        xp: result.xpAwarded,
        streak: result.streak.current,
        badges: result.badgesAwarded.length,
      });
      await Promise.all([load(), refresh()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg-50">
        <Text className="text-text-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (error && !lesson) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg-50 px-6">
        <Text className="text-center text-text-700">{error}</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-xl border border-zinc-200 px-4 py-2"
        >
          <Text>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  if (!lesson || !course) return null;

  const nextLesson =
    course.lessons.find((l) => l.order === lesson.order + 1) ?? null;

  return (
    <SafeAreaView className="flex-1 bg-bg-50" edges={["bottom"]}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-2">
        <Text className="text-xs uppercase tracking-wider text-text-500">
          {course.title} · Lesson {lesson.order}
        </Text>
        <Text className="mt-1 text-2xl font-bold text-text-900">{lesson.title}</Text>
        <Text className="mt-2 text-sm text-text-500">Reward · +{lesson.xpReward} XP</Text>

        {reward && <RewardCard reward={reward} />}

        {error && !reward && (
          <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

        <View className="mt-6 rounded-2xl bg-white p-4">
          <Text className="leading-6 text-text-700">
            {lesson.content ?? "No content yet."}
          </Text>
        </View>

        {!lesson.unlocked && !lesson.completed ? (
          <View className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Text className="text-sm text-amber-900">🔒 {lesson.lockReason}</Text>
          </View>
        ) : (
          <Pressable
            onPress={onComplete}
            disabled={submitting || lesson.completed || !!reward}
            className="mt-6 items-center rounded-xl bg-brand-600 py-3.5 active:opacity-90 disabled:opacity-60"
          >
            <Text className="text-base font-semibold text-white">
              {lesson.completed || reward
                ? "Completed ✓"
                : submitting
                  ? "Saving…"
                  : "Mark complete"}
            </Text>
          </Pressable>
        )}

        {nextLesson && (lesson.completed || reward) && (
          <Pressable
            onPress={() => router.replace(`/lesson/${nextLesson.id}`)}
            className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80"
          >
            <Text className="text-xs uppercase tracking-wider text-text-500">
              Up next
            </Text>
            <Text className="mt-1 text-base font-semibold text-text-900">
              Lesson {nextLesson.order} · {nextLesson.title}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RewardCard({ reward }: { reward: RewardToast }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [opacity]);
  return (
    <Animated.View
      style={{ opacity }}
      className="mt-4 rounded-2xl bg-brand-600 p-4"
    >
      <Text className="text-xs uppercase tracking-wider text-brand-100">
        ✓ Completed
      </Text>
      <Text className="mt-1 text-xl font-bold text-white">
        +{reward.xp} XP · streak {reward.streak}
        {reward.badges > 0
          ? ` · ${reward.badges} new badge${reward.badges > 1 ? "s" : ""}`
          : ""}
      </Text>
    </Animated.View>
  );
}
