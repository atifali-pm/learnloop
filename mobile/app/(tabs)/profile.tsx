import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function ProfileScreen() {
  const router = useRouter();
  const { state, signOut } = useAuth();

  if (state.status !== "authenticated") return null;
  const { user, stats, badges } = state;

  const onSignOut = async () => {
    await signOut();
    router.replace("/signin");
  };

  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-bg-50" edges={["top"]}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-500">
            <Text className="text-2xl font-bold text-white">{initial}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-text-900">
              {user.name ?? "Learner"}
            </Text>
            <Text className="text-sm text-text-500">{user.email}</Text>
            <Text className="mt-1 text-xs uppercase tracking-wider text-brand-700">
              {user.role}
            </Text>
          </View>
        </View>

        <View className="mt-6 flex-row flex-wrap gap-3">
          <StatPill label="Streak" value={`${stats.currentStreak}🔥 / ${stats.longestStreak}`} />
          <StatPill label="Level" value={`L${stats.level}`} />
          <StatPill label="Total XP" value={String(stats.totalXp)} />
          <StatPill label="Badges" value={String(stats.badgeCount)} />
        </View>

        <View className="mt-8">
          <Text className="mb-3 text-base font-semibold text-text-900">Badges</Text>
          {badges.length === 0 ? (
            <View className="rounded-2xl border border-dashed border-zinc-300 p-6">
              <Text className="text-center text-text-500">
                No badges yet. Finish a lesson to earn your first.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {badges.map((b) => (
                <View key={b.id} className="flex-row items-center gap-3 rounded-xl bg-white p-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100">
                    <Text className="text-lg">🏅</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-text-900">{b.name}</Text>
                    {b.description && (
                      <Text className="text-xs text-text-500">{b.description}</Text>
                    )}
                    <Text className="text-xs text-text-500">
                      Awarded {b.awardedAt.slice(0, 10)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={onSignOut}
          className="mt-10 items-center rounded-xl border border-red-200 py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-red-600">Sign out</Text>
        </Pressable>

        <Text className="mt-6 text-center text-xs text-text-500">
          LearnLoop mobile · v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-xl bg-white px-4 py-2">
      <Text className="text-xs uppercase tracking-wider text-text-500">{label}</Text>
      <Text className="text-base font-bold text-text-900">{value}</Text>
    </View>
  );
}
