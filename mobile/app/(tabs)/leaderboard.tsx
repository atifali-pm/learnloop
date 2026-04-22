import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import type { LeaderboardEntry, LeaderboardResponse } from "@learnloop/types";

export default function LeaderboardScreen() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const next = await api.getLeaderboard();
    setData(next);
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
        <Text className="text-xs uppercase tracking-wider text-text-500">Org</Text>
        <Text className="text-2xl font-bold text-text-900">Leaderboard</Text>
        {data?.self && (
          <Text className="mt-1 text-sm text-brand-700">
            You: #{data.self.rank} · {data.self.totalXp} XP
          </Text>
        )}
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Text className="text-text-500">Loading…</Text>
        ) : !data || data.top.length === 0 ? (
          <View className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-6">
            <Text className="text-center text-text-500">
              No XP awarded yet. Complete a lesson to get on the board.
            </Text>
          </View>
        ) : (
          <>
            {data.top.map((row) => (
              <Row key={row.userId} row={row} />
            ))}
            {data.self && !data.top.some((r) => r.isSelf) && (
              <View className="mt-4 rounded-2xl bg-brand-100 p-4">
                <Text className="text-xs uppercase tracking-wider text-text-500">
                  Your standing
                </Text>
                <Text className="mt-1 text-sm text-text-900">
                  You&apos;re <Text className="font-bold">#{data.self.rank}</Text> with{" "}
                  <Text className="font-bold">{data.self.totalXp} XP</Text>.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ row }: { row: LeaderboardEntry }) {
  const medalBg =
    row.rank === 1
      ? "bg-amber-500"
      : row.rank === 2
        ? "bg-zinc-400"
        : row.rank === 3
          ? "bg-amber-700"
          : "bg-zinc-200";
  const medalText = row.rank <= 3 ? "text-white" : "text-text-700";
  return (
    <View
      className={`mb-2 flex-row items-center gap-3 rounded-2xl p-3 ${
        row.isSelf ? "bg-brand-100" : "bg-white"
      }`}
    >
      <View className={`h-8 w-8 items-center justify-center rounded-full ${medalBg}`}>
        <Text className={`text-xs font-bold ${medalText}`}>#{row.rank}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text-900">
          {row.name ?? row.email}{" "}
          {row.isSelf && <Text className="text-brand-700">(you)</Text>}
        </Text>
        <Text className="text-xs text-text-500">{row.email}</Text>
      </View>
      <Text className="text-sm font-bold text-text-900">{row.totalXp} XP</Text>
    </View>
  );
}
