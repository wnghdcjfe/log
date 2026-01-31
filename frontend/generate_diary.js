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

/** 간단 검증: 필수 필드, date 범위, feel enum, feel 길이, 문장 수(>10), 글자 수(>=400) */
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

        // Feel validation with detailed error
        if (!Array.isArray(e.feel) || e.feel.length < 1) {
            throw new Error(`Item ${idx} feel must be non-empty array, got: ${JSON.stringify(e.feel)}`);
        }
        for (const f of e.feel) {
            if (typeof f !== "string") {
                throw new Error(`Item ${idx} feel contains non-string: ${JSON.stringify(f)}`);
            }
            if (!FEEL_ENUM.includes(f)) {
                throw new Error(`Item ${idx} invalid feel: "${f}" (must be one of: ${FEEL_ENUM.join(", ")})`);
            }
        }

        // Content length validation (420 chars minimum, target 600-800)
        if (e.content.length < 420) {
            throw new Error(`Item ${idx} content too short: ${e.content.length} chars (minimum 420)`);
        }

        // 문장 10개 이상 (>= 10문장)
        const sc = countSentences(e.content);
        if (sc < 10) throw new Error(`Item ${idx} content must be >= 10 sentences, got ${sc}`);
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
  아래 날짜 목록과 정확히 동일한 개수만큼(총 ${batchDates.length}개), 각 날짜에 대응하는 일기 1개씩을 생성한다.

  중요 규칙:
  - **필수: 정확히 ${batchDates.length}개의 일기를 생성해야 한다. 더 많거나 적으면 안 된다.**
  - 출력은 { "diaries": [...] } 형태의 JSON 객체다. 설명/주석/문장/마크다운 금지.
  - diaries 배열의 각 항목은 { title, date, feel, content } 필수다.
  - date는 반드시 아래 날짜 목록 중 하나여야 한다. (가능하면 목록 순서를 따라 작성)
  - feel 필드는 배열이며, 다음 5개 문자열 중에서만 선택한다. 다른 문자열 절대 금지:
    ["기쁨", "평온", "보통", "피곤", "슬픔"]
    예시: ["기쁨"], ["피곤", "슬픔"], ["평온", "기쁨"], ["보통"]
  - 내용은 남자 화자이며 여자친구가 있다.
  
  분포 규칙(100개 전체가 섞이도록, 이 배치에서도 대략 유지):
  - 40%: 다툼/오해/서운함 중심(부정 감정 포함)
  - 40%: 즐거운 데이트/화해/행복 중심(긍정 감정 포함)
  - 20%: 둘 다 있는 날(다툼 후 회복/데이트로 마무리 등)
  - 같은 유형이 3개 이상 연속되지 않게 분산한다.
  
  서운함/갈등 근거 명시 규칙(매우 중요):
  - 여자친구가 서운해하거나 화를 내는 내용이 있는 일기에서는,
    content 안에 반드시 아래 3가지를 모두 포함한다.
    1) 여자친구가 서운해진 "구체적 원인" 1~2개(행동/말/상황 단위로 명확히)
       예: 약속 지각, 연락 공백, 말투/표현, 공감 부족, 우선순위, 비교 발언, 피곤함을 핑계로 회피, 기념일/중요 일정 망각 등
    2) 그 원인이 촉발한 "여자친구의 관찰 가능한 반응"(말/행동/태도)
       예: 말수 감소, 단답, 거리두기, 표정 변화, 직접 항의, 울음, 자리 피함 등
    3) 화자가 이해한 "내 잘못/오해 포인트"와 이후 행동(사과/설명/재발 방지 약속/대화 시도 등)
  - "괜히", "그냥", "이유는 모르겠지만"처럼 원인을 흐리는 표현 금지.
  - 독자가 읽으면 왜 서운했는지 납득 가능해야 한다.
  
  다양성 규칙(반복 방지):
  - 일기마다 배경(장소/시간대), 사건, 대화 방식, 결말을 다르게 구성한다.
  - 갈등 원인은 최대한 겹치지 않게 분산한다(연락/약속/말투/질투/가치관/가족·친구/돈/일·피로/미래 계획 등).
  - content 첫 문장 시작 패턴이 서로 유사하지 않게 한다.
  - 같은 표현(“미안하다고 했다”, “서운하대”)을 반복적으로 쓰지 말고 매번 다르게 풀어쓴다.
  
  content 작성 규칙 (매우 중요):
  - **필수: content는 최소 500자 이상 작성한다. 600~800자를 목표로 한다.**
  - content는 줄바꿈(\\n)을 충분히 포함한 자연스러운 일기체로 작성한다.
  - 최소 1회는 실제 대화의 요지를 간접화법 또는 따옴표 형태로 포함한다(과도한 인용은 금지).
  - 하루의 흐름(상황 → 감정 → 사건/대화 → 정리/다짐)이 자연스럽게 보이게 한다.
  - 구체적인 디테일, 장소, 시간, 대화 내용, 감정 변화, 내면의 생각을 상세하게 담는다.
  - 짧게 요약하지 말고, 충분히 길고 자세하게 작성한다.
  
  날짜 목록:
  ${batchDates.map((d, i) => `${i + 1}. ${d}`).join("\n")}
  `.trim();

    const res = await client.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.8,
        messages: [
            {
                role: "system",
                content: "You are a diary data generator. Output ONLY valid JSON matching the schema. The 'feel' field must ONLY contain these exact Korean strings: 기쁨, 평온, 보통, 피곤, 슬픔. No other strings allowed."
            },
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

    // Count validation first
    if (entries.length !== batchDates.length) {
        throw new Error(
            `Batch ${batchIndex + 1}: Expected ${batchDates.length} entries, got ${entries.length}`
        );
    }

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
