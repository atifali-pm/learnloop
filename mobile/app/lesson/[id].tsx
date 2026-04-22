import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
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
  const [answers, setAnswers] = useState<Record<string, string>>({});

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

  const quiz = lesson?.quiz ?? null;
  const needsAllAnswers = Boolean(quiz && !lesson?.completed);
  const allAnswered = quiz
    ? quiz.questions.every((q) => Boolean(answers[q.id]))
    : true;

  const onComplete = async () => {
    if (!lesson) return;
    if (needsAllAnswers && !allAnswered) {
      setError("Pick an answer for every question.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result: CompleteLessonResponse = await api.completeLesson(
        lesson.id,
        needsAllAnswers ? answers : undefined,
      );
      if (!result.ok) {
        if (result.quiz) {
          setError(
            `Got ${result.quiz.grade.correctCount} of ${result.quiz.grade.totalCount} correct. Review the lesson and try again.`,
          );
        } else {
          setError(result.reason);
        }
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
          <Markdown style={markdownStyles}>{lesson.content ?? "No content yet."}</Markdown>
        </View>

        {quiz && !lesson.completed && !reward && (
          <View className="mt-6 rounded-2xl bg-white p-4">
            <Text className="text-xs uppercase tracking-wider text-text-500">Quick check</Text>
            <Text className="mt-1 text-sm text-text-500">
              Answer all to mark this lesson complete.
            </Text>

            <View className="mt-4 gap-5">
              {quiz.questions.map((q, qi) => (
                <View key={q.id}>
                  <Text className="text-sm font-semibold text-text-900">
                    {qi + 1}. {q.prompt}
                  </Text>
                  <View className="mt-2 gap-1.5">
                    {q.choices.map((c) => {
                      const picked = answers[q.id] === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: c.id }))
                          }
                          className={`flex-row items-center gap-2.5 rounded-md border p-2.5 ${
                            picked
                              ? "border-brand-500 bg-brand-50"
                              : "border-zinc-200"
                          }`}
                        >
                          <View
                            className={`h-4 w-4 rounded-full border-2 ${
                              picked ? "border-brand-500 bg-brand-500" : "border-zinc-300"
                            }`}
                          />
                          <Text className="flex-1 text-sm">{c.text}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {!lesson.unlocked && !lesson.completed ? (
          <View className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Text className="text-sm text-amber-900">🔒 {lesson.lockReason}</Text>
          </View>
        ) : (
          <Pressable
            onPress={onComplete}
            disabled={submitting || lesson.completed || Boolean(reward)}
            className="mt-6 items-center rounded-xl bg-brand-600 py-3.5 active:opacity-90 disabled:opacity-60"
          >
            <Text className="text-base font-semibold text-white">
              {lesson.completed || reward
                ? "Completed ✓"
                : submitting
                  ? "Saving…"
                  : quiz
                    ? "Submit answers"
                    : "Mark complete"}
            </Text>
          </Pressable>
        )}

        {nextLesson && (lesson.completed || reward) && (
          <Pressable
            onPress={() => router.replace(`/lesson/${nextLesson.id}`)}
            className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80"
          >
            <Text className="text-xs uppercase tracking-wider text-text-500">Up next</Text>
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

const markdownStyles = {
  body: { color: "#3f3f46", fontSize: 15, lineHeight: 22 },
  heading2: { fontSize: 18, fontWeight: "700" as const, marginTop: 14, marginBottom: 6, color: "#18181b" },
  heading3: { fontSize: 16, fontWeight: "700" as const, marginTop: 12, marginBottom: 6, color: "#18181b" },
  paragraph: { marginTop: 6, marginBottom: 10 },
  bullet_list: { marginTop: 4, marginBottom: 10 },
  list_item: { marginVertical: 2 },
  strong: { fontWeight: "700" as const },
  em: { fontStyle: "italic" as const },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    paddingLeft: 12,
    marginVertical: 10,
    color: "#52525b",
  },
  code_inline: {
    backgroundColor: "#f4f4f5",
    paddingHorizontal: 4,
    borderRadius: 3,
    fontFamily: "monospace",
  },
};
