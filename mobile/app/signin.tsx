import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { ApiClientError } from "@/lib/api";

const DEMO_ACCOUNTS = [
  { label: "Learner", email: "learner@demo.test", password: "learner123" },
  { label: "Admin", email: "admin@demo.test", password: "admin123" },
  { label: "Instructor", email: "instructor@demo.test", password: "instructor123" },
];

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setError("Email or password is incorrect.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (acct: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(acct.email);
    setPassword(acct.password);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-8 pb-12"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-10 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
              <Text className="text-lg font-bold text-white">L</Text>
            </View>
            <Text className="text-2xl font-bold text-text-900">LearnLoop</Text>
          </View>

          <Text className="text-3xl font-bold text-text-900">Sign in</Text>
          <Text className="mt-2 text-base text-text-500">
            Daily habits, measurable progress. Pick a demo account or type your own.
          </Text>

          <View className="mt-6 gap-4">
            <View>
              <Text className="mb-1 text-sm font-medium text-text-700">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base"
              />
            </View>
            <View>
              <Text className="mb-1 text-sm font-medium text-text-700">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base"
              />
            </View>

            {error && (
              <Text className="text-sm text-red-600">{error}</Text>
            )}

            <Pressable
              onPress={onSubmit}
              disabled={submitting || !email || !password}
              className="mt-2 items-center justify-center rounded-xl bg-brand-600 px-4 py-3.5 active:opacity-80 disabled:opacity-50"
            >
              <Text className="text-base font-semibold text-white">
                {submitting ? "Signing in…" : "Sign in"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-10">
            <Text className="mb-3 text-sm font-medium text-text-700">Quick demo</Text>
            <View className="gap-2">
              {DEMO_ACCOUNTS.map((acct) => (
                <Pressable
                  key={acct.label}
                  onPress={() => fillDemo(acct)}
                  className="flex-row items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 active:opacity-80"
                >
                  <View>
                    <Text className="text-base font-semibold text-text-900">
                      {acct.label}
                    </Text>
                    <Text className="text-xs text-text-500">{acct.email}</Text>
                  </View>
                  <Text className="text-brand-600">Use →</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
