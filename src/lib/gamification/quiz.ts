import { z } from "zod";

export const quizChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  correct: z.boolean().optional(),
});

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  choices: z.array(quizChoiceSchema).min(2),
  explanation: z.string().optional(),
});

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1),
});

export type QuizChoice = z.infer<typeof quizChoiceSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type Quiz = z.infer<typeof quizSchema>;

/** Answers from the learner: { [questionId]: choiceId }. */
export const answersSchema = z.record(z.string(), z.string());
export type QuizAnswers = z.infer<typeof answersSchema>;

export function parseQuiz(raw: unknown): Quiz | null {
  if (!raw) return null;
  const parsed = quizSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export type QuizGradeResult = {
  correctCount: number;
  totalCount: number;
  allCorrect: boolean;
  wrong: { questionId: string; pickedChoiceId: string | null; correctChoiceId: string | null }[];
};

export function gradeQuiz(quiz: Quiz, answers: QuizAnswers): QuizGradeResult {
  let correctCount = 0;
  const wrong: QuizGradeResult["wrong"] = [];
  for (const q of quiz.questions) {
    const picked = answers[q.id] ?? null;
    const correctChoice = q.choices.find((c) => c.correct);
    const correctId = correctChoice?.id ?? null;
    if (picked !== null && picked === correctId) {
      correctCount++;
    } else {
      wrong.push({
        questionId: q.id,
        pickedChoiceId: picked,
        correctChoiceId: correctId,
      });
    }
  }
  return {
    correctCount,
    totalCount: quiz.questions.length,
    allCorrect: correctCount === quiz.questions.length,
    wrong,
  };
}

/** Strip the `correct` flag before sending quiz data to clients. */
export function redactQuizForLearner(quiz: Quiz): Quiz {
  return {
    questions: quiz.questions.map((q) => ({
      ...q,
      choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
      explanation: undefined,
    })),
  };
}
