import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function initClient(apiKey: string): void {
  client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

function getClient(): Anthropic {
  if (!client) throw new Error("API key not configured");
  return client;
}

const NY_NOTARY_SYSTEM = `You are an expert tutor for the New York State Notary Public licensing exam.
You have comprehensive knowledge of:
- NY Executive Law Article 6 (Notary Public Law)
- NY Real Property Law provisions on acknowledgments
- NY Uniform Commercial Code (negotiable instruments/protests)
- Statutory fee schedules
- Notarial acts: acknowledgments, jurats, oaths, affirmations, depositions, protests, signature by mark
- Common misconduct issues and penalties
- Commissioner of Deeds

Be accurate, concise, and educational. When explaining legal concepts, cite the relevant statute where possible.`;

export interface DrillQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateDrillQuestion(concept: string): Promise<DrillQuestion> {
  const c = getClient();
  const response = await c.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: NY_NOTARY_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Generate a multiple-choice practice question about "${concept}" for the NY Notary Public exam.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "question": "The question text here?",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correctIndex": 0,
  "explanation": "Why the correct answer is correct, with relevant law cited."
}

Make the question realistic and exam-level difficulty. The correctIndex is 0-based.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No response from AI");
  }

  const text = textBlock.text.trim();
  // Strip any markdown code fences if present
  const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(jsonStr) as DrillQuestion;
}

export async function evaluateOpenAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string
): Promise<string> {
  const c = getClient();
  const response = await c.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 512,
    system: NY_NOTARY_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${userAnswer}

Briefly evaluate whether the student's answer is correct or close, and explain the key concept in 2-3 sentences.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}

export async function explainWrongAnswer(
  question: string,
  choices: string[],
  correctIndex: number,
  chosenIndex: number
): Promise<string> {
  const c = getClient();
  const response = await c.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 600,
    system: NY_NOTARY_SYSTEM,
    messages: [
      {
        role: "user",
        content: `A student answered an NY Notary exam question incorrectly. Explain why their answer is wrong and why the correct answer is right.

Question: ${question}
Student chose: "${choices[chosenIndex]}"
Correct answer: "${choices[correctIndex]}"

Give a clear, educational explanation in 2-4 sentences.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamTutorResponse(
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const c = getClient();
  const stream = c.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: NY_NOTARY_SYSTEM,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
