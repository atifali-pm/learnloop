/**
 * Lesson content + quizzes for the "Habit Loop 101" demo course.
 *
 * Kept separate from scripts/seed-demo.ts so the content can be imported from
 * tests or re-seed scripts without duplicating the full seed flow.
 *
 * Quiz schema matches src/lib/gamification/quiz.ts.
 */

export type QuizQuestion = {
  id: string;
  prompt: string;
  choices: { id: string; text: string; correct?: boolean }[];
  explanation?: string;
};

export type LessonSeed = {
  title: string;
  content: string;
  xpReward: number;
  quiz?: { questions: QuizQuestion[] };
};

export const HABIT_LOOP_101: LessonSeed[] = [
  {
    title: "Why habits beat motivation",
    xpReward: 10,
    content: `## Motivation runs out. Habits don't.

Motivation is a feeling. Feelings change with sleep, mood, weather, and whether the coffee was any good. Habits are grooves in your daily schedule. Once carved, they run whether you feel like it or not.

The shift you need to make: **stop trying to feel like it**. Instead, design your day so the thing you want to do is the easiest thing to do at a specific moment.

### The loop

Every habit has four parts:

1. **Cue** — a signal that triggers the behavior (time of day, a place, a previous action).
2. **Craving** — the want. Why this moment, why this action.
3. **Response** — what you actually do.
4. **Reward** — what you get. Felt relief, small win, streak going up.

If any part is missing, the habit doesn't stick. Most people only think about the response ("I'll exercise more") and forget the cue and the reward.

Over the next 9 lessons you'll design each part deliberately.`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "Which of these is NOT part of the habit loop?",
          choices: [
            { id: "a", text: "Cue" },
            { id: "b", text: "Craving" },
            { id: "c", text: "Motivation", correct: true },
            { id: "d", text: "Reward" },
          ],
          explanation:
            "The four parts are cue, craving, response, and reward. Motivation is a feeling that comes and goes; habits are what you build to replace it.",
        },
        {
          id: "q2",
          prompt: "Why do habits outperform motivation over the long run?",
          choices: [
            { id: "a", text: "Habits are fueled by stronger feelings." },
            {
              id: "b",
              text: "Habits run independently of how you feel in the moment.",
              correct: true,
            },
            { id: "c", text: "Motivation is a myth." },
          ],
        },
      ],
    },
  },
  {
    title: "The 2-minute rule",
    xpReward: 10,
    content: `## If you want to start something, make it take 2 minutes or less.

New habits fail when the bar is too high. "Run 3 miles" on day one is a trap. "Put on running shoes and walk to the end of the block" is a win.

The 2-minute rule: **scale any new habit down to a version you can complete in under 2 minutes**. Read one page. Do one push-up. Write one sentence. Then stop, even if you want to keep going.

### Why it works

Two reasons:

- **It bypasses resistance.** The part of your brain that says "not today" doesn't have time to argue about 2 minutes.
- **It cements the identity.** Every 2-minute session is a vote for "I am the kind of person who does this." Identity change beats outcome change.

Once the 2-minute version is automatic (two weeks, give or take), you scale up. But the 2-minute floor stays forever. On your worst day, you still do the 2 minutes. That's what keeps the streak alive.`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "A good 2-minute version of 'meditate daily' is:",
          choices: [
            { id: "a", text: "Sit for 2 minutes with your eyes closed", correct: true },
            { id: "b", text: "Meditate for 30 minutes three days a week" },
            { id: "c", text: "Listen to a 2-hour podcast about meditation" },
          ],
        },
        {
          id: "q2",
          prompt: "What happens when you finish your 2-minute session feeling you could do more?",
          choices: [
            { id: "a", text: "Push through for another 20 minutes to build the habit faster." },
            { id: "b", text: "Stop anyway. Wanting more next time is the point.", correct: true },
            { id: "c", text: "Skip tomorrow, because you did extra today." },
          ],
        },
      ],
    },
  },
  {
    title: "Stacking cues",
    xpReward: 10,
    content: `## Attach the new habit to something you already do.

New habits die because they have no home. You want to floss, but there's no moment in your day reserved for flossing. You want to journal, but "sometime in the evening" is not a time.

The fix: **habit stacking**. Pick an existing rock-solid habit as the anchor, and bolt the new habit to the end of it.

> After I brush my teeth at night, I will floss one tooth.
> After I pour my morning coffee, I will write one sentence in my journal.
> After I sit down at my desk, I will review today's top task.

### Rules for the anchor

- **It must already be automatic.** If you sometimes skip it, you'll skip the new habit too.
- **It must be specific in time and place.** "When I feel hungry" is too vague. "When I finish lunch" is not.
- **It must end cleanly.** "After I brush my teeth" works. "While I'm on my phone" doesn't; the anchor never actually ends.

Once the new habit is stable, stack another one on top. Chains emerge: coffee → journal → review → first deep-work block.`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "Which of these is a good habit-stack anchor?",
          choices: [
            { id: "a", text: "When I feel motivated" },
            { id: "b", text: "After I pour my morning coffee", correct: true },
            { id: "c", text: "Sometime after lunch" },
          ],
        },
        {
          id: "q2",
          prompt: "Why must the anchor habit already be automatic?",
          choices: [
            { id: "a", text: "So the new habit inherits the same reliability.", correct: true },
            { id: "b", text: "So you don't have to think about the anchor anymore." },
            { id: "c", text: "Because willpower is finite." },
          ],
        },
      ],
    },
  },
  {
    title: "Designing the environment",
    xpReward: 10,
    content: `## Your environment does most of your deciding for you.

If your phone is face-up on your desk, you'll check it. If the cookies are on the counter, you'll eat them. If your book is on the couch, you'll read it.

Willpower is the most expensive battery in your brain. Environment is free. **Make the habit you want the path of least resistance. Make the one you don't want the path of most.**

### Concrete moves

- **Make it obvious.** Running shoes next to the bed. Water bottle on the desk. Book on the pillow.
- **Make it easy.** Pre-chop the vegetables. Pre-fill the bag. Save the Zoom link.
- **Make it attractive.** Pair the habit with something you already enjoy. Podcast only while running.
- **Make it satisfying.** Check a box. Mark the streak. The small win has to land.

And the inverse for habits you want to drop:

- **Invisible.** Phone in the drawer, not the pocket.
- **Hard.** Log out of the app every time. Delete the shortcut.
- **Unattractive.** Notice out loud: "this is costing me an hour I won't get back."
- **Unsatisfying.** Tell a friend you'll pay them $20 if you break the rule.`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "Which environment design makes a good habit MORE likely?",
          choices: [
            { id: "a", text: "Hide the running shoes in the closet so they don't clutter the room." },
            { id: "b", text: "Put the running shoes next to your bed.", correct: true },
            { id: "c", text: "Only run when you feel ready." },
          ],
        },
        {
          id: "q2",
          prompt: "To drop a habit, you want to:",
          choices: [
            { id: "a", text: "Rely on willpower in the moment." },
            { id: "b", text: "Make the habit invisible, hard, unattractive, and unsatisfying.", correct: true },
            { id: "c", text: "Announce it loudly to yourself every morning." },
          ],
        },
      ],
    },
  },
  {
    title: "Tracking the loop",
    xpReward: 10,
    content: `## What gets tracked gets repeated.

The act of marking "done" is a tiny reward on its own. Your brain likes closure. A streak is a visible chain of closures; breaking it feels physically bad, which is exactly the point.

### How to track without making it a job

- **One metric.** Don't track five things about the same habit. Pick the one that matters: did I do the 2-minute version or not?
- **Yes/no, not grades.** Did you show up? Green. No? Red. Don't rate it out of 10.
- **Log in under 10 seconds.** If tracking takes longer than the habit, you'll stop tracking.
- **Visible.** A paper calendar on the wall, a streak counter on your phone's home screen, a sticker sheet on the fridge. Make the chain impossible to ignore.

### What not to do

- Don't start tracking more than 2 habits at once. You'll burn out the tracking habit itself.
- Don't "catch up" by marking yesterday green because you did extra today. The whole point is showing up on that day.
- Don't rebuild the chain in your head when you miss a day. The app or the paper is the source of truth.`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "Why should you track with yes/no rather than a 1 to 10 score?",
          choices: [
            { id: "a", text: "Yes/no is faster and removes the judgment step.", correct: true },
            { id: "b", text: "Scores are less accurate." },
            { id: "c", text: "Because scoring is too hard." },
          ],
        },
        {
          id: "q2",
          prompt: "How many habits should you track at the same time when starting?",
          choices: [
            { id: "a", text: "As many as you can." },
            { id: "b", text: "At most 2.", correct: true },
            { id: "c", text: "One per hour of the day." },
          ],
        },
      ],
    },
  },
  {
    title: "Streak psychology",
    xpReward: 10,
    content: `## A streak is a contract with yesterday-you.

Streaks work because they convert "I might do this" into "I'd better not break this." Each green day raises the psychological cost of red. By day 30, skipping isn't just a skip; it's destroying a month of evidence.

### The failure mode: streak fragility

If your whole identity depends on the streak, one red day burns the house down. You skip Monday, so Tuesday becomes "what's the point," and by Friday the habit is dead.

Two safety valves:

1. **Never miss twice in a row.** One miss is an accident. Two in a row is the start of a new habit, and it's the wrong one. Make "back on it tomorrow" your automatic response to a miss.
2. **Separate streak from self-worth.** A streak is a tool, not an identity. "I broke my streak" is fine. "I'm the kind of person who can't keep commitments" is not.

### LearnLoop stores two streaks per user

- **Current:** how many days in a row you've hit it right now.
- **Longest:** your personal record. This one doesn't reset when you miss.

The longest number is the one that compounds over years. The current is what keeps today honest.`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "What's the single most important rule after a missed day?",
          choices: [
            { id: "a", text: "Punish yourself the next day with double." },
            { id: "b", text: "Never miss twice in a row.", correct: true },
            { id: "c", text: "Restart from scratch with a new habit." },
          ],
        },
        {
          id: "q2",
          prompt: "Why does LearnLoop keep BOTH 'current' and 'longest' streak numbers?",
          choices: [
            { id: "a", text: "So you can brag." },
            { id: "b", text: "Current keeps today honest; longest compounds across resets.", correct: true },
            { id: "c", text: "It's an accident; one of them is going away next release." },
          ],
        },
      ],
    },
  },
  {
    title: "Rewards that stick",
    xpReward: 10,
    content: `## Small rewards at the end of the loop are what make it self-sustaining.

A reward is what tells your brain "this was worth it, do it again." Without it, the habit is a chore. The good news: the reward doesn't have to be big. It just has to be immediate.

### Immediate beats big

Your brain over-weights present rewards and under-weights future ones. That's why "exercise now for better health in 10 years" loses to "scroll now for a hit of novelty in 3 seconds."

So attach a small, immediate reward to the new habit:

- After your run, listen to the good podcast for 5 minutes.
- After writing one sentence, make the coffee.
- After saving $20, mark a physical jar.

The smallest reward that makes you smile is enough.

### Avoid the trap

Don't reward the habit with something that undoes it. "I worked out so now I'll eat a pizza" cancels the loop. Pair the habit with a reward that strengthens the identity you're building: "I am a person who moves every day and enjoys good food that fuels me." Not: "I am a person who earns cheat meals."`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "A good reward for a new habit is:",
          choices: [
            { id: "a", text: "Big and far in the future." },
            { id: "b", text: "Small, immediate, and aligned with the identity.", correct: true },
            { id: "c", text: "Something that cancels out the habit." },
          ],
        },
        {
          id: "q2",
          prompt: "Your brain over-weights rewards that are:",
          choices: [
            { id: "a", text: "In the distant future." },
            { id: "b", text: "Immediate.", correct: true },
            { id: "c", text: "Expensive." },
          ],
        },
      ],
    },
  },
  {
    title: "When to skip (and why)",
    xpReward: 10,
    content: `## Skipping is part of the plan, not a failure of it.

You will miss. Travel days, illness, a 4am fire at work. The question isn't "will I miss" but "what's my response when I do."

### Two kinds of skip

**Intentional skip.** You knew ahead of time. You're sick. You're on a red-eye. You had a real emergency. The response: mark the day yellow in your head, not red. Nothing was broken; a constraint moved you.

**Drift skip.** You just forgot, or didn't feel like it, or scrolled instead. This is a warning. One drift skip is fine; two in a row means the system failed and you need to debug.

### Questions to debug a drift skip

- Was the cue missing?
- Did the anchor habit break?
- Did the environment change (traveling, houseguests, different kitchen)?
- Did the 2-minute version suddenly feel like 20 minutes?

Most drift skips are environmental, not motivational. You didn't get weak; your kitchen is in someone else's house. Redesign the environment or pick a simpler 2-minute version.`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "Two drift skips in a row should be treated as:",
          choices: [
            { id: "a", text: "A sign to quit the habit." },
            { id: "b", text: "A debugging prompt: what changed in cue, anchor, or environment?", correct: true },
            { id: "c", text: "Just bad luck." },
          ],
        },
        {
          id: "q2",
          prompt: "An intentional skip (known in advance, for a real reason) should be marked:",
          choices: [
            { id: "a", text: "Red, exactly like a drift skip." },
            { id: "b", text: "Yellow / acknowledged, not treated as failure.", correct: true },
            { id: "c", text: "Green, because you planned for it." },
          ],
        },
      ],
    },
  },
  {
    title: "Re-starting after a break",
    xpReward: 10,
    content: `## The first day back is the whole game.

Long break? You're at zero streak but you're not at zero skill. The habit is still in your muscle memory; it just needs an on-ramp.

### The 50% rule

On day one back, do **half** of whatever your pre-break level was. If you were running 5 km, run 2.5. If you were journaling 2 pages, write 1. If you were meditating 15 minutes, sit for 8.

You are not punishing past-you for breaking. You are inviting present-you back. Pride is fine, injury is not.

### Re-anchor, don't rebuild

You probably already had a working cue stack. Don't invent a new one. Go back to the exact cue and do the 2-minute version right after it. If the cue has changed (new home, new schedule), pick the closest equivalent.

### Expect the wobble

Days 1 to 3 feel mechanical and unrewarding. Day 4 to 7 the old rhythm comes back. By day 10 you're running the same loop with the same reward signal. Just survive the wobble.`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "You ran 5 km/day before a 3-week break. On day 1 back, you should:",
          choices: [
            { id: "a", text: "Run 7 km to make up for lost time." },
            { id: "b", text: "Run 2.5 km and call it a win.", correct: true },
            { id: "c", text: "Wait until you feel like running 5 km again." },
          ],
        },
        {
          id: "q2",
          prompt: "When re-starting, the first few days will feel:",
          choices: [
            { id: "a", text: "Mechanical and unrewarding; the wobble before the rhythm returns.", correct: true },
            { id: "b", text: "Exactly as good as they did before the break." },
            { id: "c", text: "Worse every day, permanently." },
          ],
        },
      ],
    },
  },
  {
    title: "Graduating the loop",
    xpReward: 10,
    content: `## The goal is identity, not a forever streak.

At some point the habit stops being something you're tracking and starts being something you are. The streak counter becomes a souvenir. That's graduation.

### How to know you've graduated

- The 2-minute version is boring. You do it without thinking.
- Missing a day feels weird, not guilt-inducing.
- You don't need the tracker to remember; the cue + anchor fires on its own.
- You've scaled beyond the 2-minute floor and stayed there naturally.

### What to do at graduation

1. **Keep the tracker for another 30 days as insurance.** It's free.
2. **Stack a new habit on top.** You've unlocked an anchor. Use it.
3. **Retire gracefully.** When you're ready, stop tracking this specific habit. It's part of who you are now.

### The long game

Over years, this compounds. One graduated habit unlocks an anchor for the next. By the time you've run LearnLoop's playbook on five habits, you have a daily schedule that designs itself, and your identity has shifted from "person who's trying to..." to "person who does..."

That's the whole product in one sentence.

Congratulations on finishing Habit Loop 101.`,
    quiz: {
      questions: [
        {
          id: "q1",
          prompt: "What's the sign you've graduated a habit?",
          choices: [
            { id: "a", text: "You've hit your longest streak ever." },
            { id: "b", text: "The habit happens without thinking, and missing a day feels weird.", correct: true },
            { id: "c", text: "The app sends you a badge." },
          ],
        },
        {
          id: "q2",
          prompt: "After a habit graduates, the playbook's next step is:",
          choices: [
            { id: "a", text: "Stack a new habit on the now-automatic anchor.", correct: true },
            { id: "b", text: "Start over with a completely new anchor." },
            { id: "c", text: "Delete the app and stop tracking forever." },
          ],
        },
      ],
    },
  },
];
