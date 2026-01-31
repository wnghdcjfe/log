import "dotenv/config";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OUT_DIR = path.join(process.cwd(), "data");
const OUT_FILE = path.join(OUT_DIR, "generated_diaries.json");

// 2025-10-01부터 2일마다, 2026-02-01까지(포함) 작성한 것으로 생성
const START_DATE = "2025-10-01";
const END_DATE = "2026-02-01"; // 오늘 기준 고정
const BATCH_SIZE = 10;

const FEEL_ENUM = ["기쁨", "평온", "보통", "피곤", "슬픔"];

/** YYYY-MM-DD 문자열을 Date로 (UTC 기준) */
function parseYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date -> YYYY-MM-DD (UTC 기준) */
function toYmd(date) {
  return date.toISOString().slice(0, 10);
}

/** 시작~끝 날짜를 stepDays 간격으로 전부 생성 (UTC 기준, end 포함) */
function makeDatesEveryNDays(startYmd, endYmd, stepDays = 2) {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);

  if (end.getTime() < start.getTime()) throw new Error("END_DATE must be >= START_DATE");
  if (stepDays <= 0) throw new Error("stepDays must be > 0");

  const dates = [];
  let cur = start;

  while (cur.getTime() <= end.getTime()) {
    dates.push(toYmd(cur));
    cur = new Date(cur.getTime() + stepDays * 24 * 60 * 60 * 1000);
  }

  return dates;
}

/** 문장 수 세기: . ! ? 기준 (단순 휴리스틱) */
function countSentences(text) {
  if (typeof text !== "string") return 0;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;

  // "..." 같은 연속 구두점 정리
  const normalized = cleaned.replace(/([.!?])\1+/g, "$1");

  const parts = normalized
    .split(/(?<=[.!?])\s+/) // 종결부호 뒤 공백 기준 분리
    .map((s) => s.trim())
    .filter(Boolean);

  return Math.max(1, parts.length);
}

/** 간단 검증: 필수 필드, date 범위, feel enum, feel 길이, 문장 수(>10) */
function validateEntries(entries, startYmd, endYmd) {
  const start = startYmd;
  const end = endYmd;

  if (!Array.isArray(entries)) throw new Error("Response is not an array");

  for (const [idx, e] of entries.entries()) {
    if (!e || typeof e !== "object") throw new Error(`Item ${idx} is not object`);
    for (const k of ["title", "date", "feel", "content"]) {
      if (!(k in e)) throw new Error(`Item ${idx} missing field: ${k}`);
    }

    if (typeof e.title !== "string" || !e.title.trim()) throw new Error(`Item ${idx} invalid title`);
    if (typeof e.content !== "string" || !e.content.trim()) throw new Error(`Item ${idx} invalid content`);
    if (typeof e.date !== "string") throw new Error(`Item ${idx} invalid date type`);
    if (e.date < start || e.date > end) throw new Error(`Item ${idx} date out of range: ${e.date}`);

    if (!Array.isArray(e.feel) || e.feel.length < 1) throw new Error(`Item ${idx} feel must be non-empty array`);
    for (const f of e.feel) {
      if (!FEEL_ENUM.includes(f)) throw new Error(`Item ${idx} invalid feel: ${f}`);
    }

    // 문장 10 초과 강제 (= 11문장 이상)
    const sc = countSentences(e.content);
    if (sc <= 10) throw new Error(`Item ${idx} content must be > 10 sentences, got ${sc}`);
  }
}

/** 배치 생성: 지정한 날짜 목록(길이 N)에 맞춰 N개 생성 */
async function generateBatch(batchDates, batchIndex, totalBatches) {
  // JSON Schema - 최상위는 object여야 함
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["diaries"],
    properties: {
      diaries: {
        type: "array",
        minItems: batchDates.length,
        maxItems: batchDates.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "date", "feel", "content"],
          properties: {
            title: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD" },
            feel: {
              type: "array",
              minItems: 1,
              maxItems: 4,
              items: { type: "string", enum: FEEL_ENUM },
            },
            content: { type: "string" },
          },
        },
      },
    },
  };

  const prompt = `
너는 일기 앱 더미 데이터 생성기다.
아래 날짜 목록과 동일한 개수만큼, 각 날짜에 대응하는 일기 1개씩을 생성한다.

중요 규칙:
- 출력은 { "diaries": [...] } 형태의 JSON 객체다. 설명/주석/문장 금지.
- diaries 배열의 각 항목은 { title, date, feel, content } 필수다.
- date는 반드시 아래 날짜 목록 중 하나여야 한다. (가능하면 목록 순서를 따라 작성)
- feel은 아래 enum 중 1~4개만 넣는다. 그 외 문자열 금지.
  enum: ${FEEL_ENUM.join(", ")}
- 내용은 남자 화자이며 여자친구가 있다.
- 100개 전체가 섞이도록, 이 배치에서도 다음 비율을 대략 지킨다.
  * 40%: 여자친구와 다툼/오해/서운함이 중심(부정 감정 포함)
  * 40%: 즐거운 데이트/화해/행복한 순간 중심(긍정 감정 포함)
  * 20%: 둘 다 있는 날(다툼 후 화해해서 데이트로 마무리 등)
- content는 줄바꿈(\\n)을 충분히 포함한 자연스러운 일기체로 작성한다.
- content는 반드시 "문장"이 11개 이상이어야 한다. (10문장 초과)
- title은 중복되지 않게 구체적으로 쓴다.

날짜 목록:
${batchDates.map((d, i) => `${i + 1}. ${d}`).join("\n")}
`.trim();

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.9,
    messages: [
      { role: "system", content: "You must output strictly valid JSON that matches the schema. No extra text." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: `diary_batch_${batchIndex + 1}_of_${totalBatches}`,
        schema,
      },
    },
  });

  const jsonText = res.choices?.[0]?.message?.content ?? '{"diaries":[]}';
  const parsed = JSON.parse(jsonText);
  const entries = parsed.diaries || [];

  // 기본 검증(문장수 포함)
  validateEntries(entries, START_DATE, END_DATE);

  // 날짜가 batchDates에 포함되는지 최종 체크
  const set = new Set(batchDates);
  for (const e of entries) {
    if (!set.has(e.date)) {
      throw new Error(`Batch ${batchIndex + 1}: date not in batch list: ${e.date}`);
    }
  }

  return entries;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is missing in environment.");
    process.exit(1);
  }

  // 2일 간격으로 전부 생성
  const dates = makeDatesEveryNDays(START_DATE, END_DATE, 2);
  const TOTAL = dates.length;

  const batches = [];
  for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
    batches.push(dates.slice(i, i + BATCH_SIZE));
  }

  const all = [];
  for (let b = 0; b < batches.length; b++) {
    const batchDates = batches[b];
    const items = await generateBatch(batchDates, b, batches.length);
    all.push(...items);
    console.log(`Batch ${b + 1}/${batches.length} done: +${items.length} (total ${all.length}/${TOTAL})`);
  }

  // 혹시 title 중복이 생기면 간단하게 후처리(최소한으로)
  const seenTitle = new Map();
  for (const e of all) {
    const key = e.title.trim();
    if (!seenTitle.has(key)) seenTitle.set(key, 1);
    else {
      const n = seenTitle.get(key) + 1;
      seenTitle.set(key, n);
      e.title = `${e.title} (${n})`;
    }
  }

  // 최종 개수/범위/문장수 검증
  if (all.length !== TOTAL) throw new Error(`Expected ${TOTAL}, got ${all.length}`);
  validateEntries(all, START_DATE, END_DATE);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2), "utf-8");
  console.log(`Saved: ${OUT_FILE}`);
  console.log(`Total diaries: ${TOTAL} (every 2 days from ${START_DATE} to ${END_DATE})`);
}

main().catch((e) => {
  console.error("Failed:", e?.message ?? e);
  process.exit(1);
});
