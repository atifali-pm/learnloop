import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type React from "react";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#18181b" },
  header: { borderBottomWidth: 1, borderColor: "#e4e4e7", paddingBottom: 12, marginBottom: 20 },
  brand: { fontSize: 10, color: "#71717a", letterSpacing: 1, textTransform: "uppercase" },
  name: { fontSize: 22, marginTop: 4, fontWeight: 700 },
  email: { fontSize: 10, color: "#71717a", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 18 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 4,
    padding: 10,
  },
  statLabel: { fontSize: 9, color: "#71717a", textTransform: "uppercase", letterSpacing: 1 },
  statValue: { fontSize: 16, marginTop: 4, fontWeight: 700 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 14 },
  lessonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderColor: "#f4f4f5",
  },
  lessonOrder: { width: 30, color: "#71717a" },
  lessonTitle: { flex: 1 },
  lessonStatus: { width: 70, textAlign: "right", color: "#71717a" },
  badgeRow: { marginBottom: 4 },
  footer: { marginTop: 24, fontSize: 9, color: "#a1a1aa", textAlign: "center" },
});

export type ReportCardData = {
  generatedAt: Date;
  orgName: string;
  user: { name: string | null; email: string };
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  badges: { name: string; awardedAt: Date }[];
  courses: {
    title: string;
    lessons: { order: number; title: string; completedAt: Date | null }[];
  }[];
};

function ReportCard({ data }: { data: ReportCardData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{data.orgName} · Report card</Text>
          <Text style={styles.name}>{data.user.name ?? data.user.email}</Text>
          <Text style={styles.email}>{data.user.email}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>L{data.level}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Total XP</Text>
            <Text style={styles.statValue}>{data.totalXp}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>
              {data.currentStreak} / {data.longestStreak}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Badges</Text>
            <Text style={styles.statValue}>{data.badges.length}</Text>
          </View>
        </View>

        {data.badges.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Badges earned</Text>
            {data.badges.map((b) => (
              <Text key={b.name} style={styles.badgeRow}>
                • {b.name}{" "}
                <Text style={{ color: "#71717a" }}>
                  ({b.awardedAt.toISOString().slice(0, 10)})
                </Text>
              </Text>
            ))}
          </View>
        )}

        {data.courses.map((course) => (
          <View key={course.title}>
            <Text style={styles.sectionTitle}>{course.title}</Text>
            {course.lessons.map((l) => (
              <View key={l.order} style={styles.lessonRow}>
                <Text style={styles.lessonOrder}>#{l.order}</Text>
                <Text style={styles.lessonTitle}>{l.title}</Text>
                <Text style={styles.lessonStatus}>
                  {l.completedAt ? l.completedAt.toISOString().slice(0, 10) : "—"}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.footer}>
          Generated {data.generatedAt.toISOString().slice(0, 19).replace("T", " ")}Z · LearnLoop
        </Text>
      </Page>
    </Document>
  );
}

export async function renderReportCardPdf(data: ReportCardData): Promise<ReadableStream<Uint8Array>> {
  const element = ReportCard({ data }) as React.ReactElement<DocumentProps>;
  const stream = await renderToStream(element);
  return nodeStreamToWeb(stream);
}

function nodeStreamToWeb(
  nodeStream: NodeJS.ReadableStream,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => {
        const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(buf));
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
  });
}
