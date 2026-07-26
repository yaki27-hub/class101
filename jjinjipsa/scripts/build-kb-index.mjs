/*
 * kb/*.md → lib/kb/index.generated.json
 *
 * 런타임에 파일시스템을 읽지 않기 위해(서버리스 번들에 md가 포함되지 않음)
 * 빌드 전에 인덱스를 만들어 커밋한다. 본문 전체가 아니라 답변 판단에 필요한
 * 섹션만 잘라 담는다 — 프롬프트 토큰을 아끼기 위해서.
 *
 * 실행: npm run kb:index
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KB_DIR = join(ROOT, "kb");
const OUT = join(ROOT, "lib", "kb", "index.generated.json");

/** 아주 작은 YAML frontmatter 파서 — 이 저장소의 KB 형식(문자열/리스트)만 다룬다 */
function parseFrontmatter(fm) {
  const out = {};
  const lines = fm.split("\n");
  let key = null;
  for (const raw of lines) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const listItem = /^\s+-\s+(.*)$/.exec(raw);
    if (listItem && key) {
      const v = listItem[1].trim().replace(/^["']|["']$/g, "");
      // sources는 `- name: X` / `url: Y` 형태라 별도 처리
      const named = /^name:\s*(.*)$/.exec(v);
      if (named) out[key].push({ name: named[1].trim() });
      else if (/^url:\s*/.test(v)) {
        const last = out[key][out[key].length - 1];
        if (last && typeof last === "object") last.url = v.replace(/^url:\s*/, "").trim();
      } else out[key].push(v);
      continue;
    }
    const kv = /^([a-z_]+):\s*(.*)$/.exec(raw);
    if (!kv) continue;
    key = kv[1];
    const val = kv[2].trim();
    if (val === "") out[key] = [];
    else if (val === "[]") out[key] = [];
    else if (val.startsWith("[") && val.endsWith("]")) {
      out[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else out[key] = val.replace(/^["']|["']$/g, "");
  }
  return out;
}

/** 본문에서 특정 H2 섹션을 뽑아 길이를 제한한다 */
function section(body, heading, max) {
  const re = new RegExp(`^##\\s*${heading}.*$`, "m");
  const m = re.exec(body);
  if (!m) return "";
  const start = m.index + m[0].length;
  const next = body.slice(start).search(/^##\s/m);
  const raw = next >= 0 ? body.slice(start, start + next) : body.slice(start);
  const text = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\*\*/g, "")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const docs = [];
for (const cat of readdirSync(KB_DIR)) {
  const dir = join(KB_DIR, cat);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const raw = readFileSync(join(dir, file), "utf8");
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    if (!m) {
      console.warn(`  frontmatter 없음, 건너뜀: ${cat}/${file}`);
      continue;
    }
    const fm = parseFrontmatter(m[1]);
    const body = m[2];
    docs.push({
      id: fm.doc_id,
      ko: fm.disease_ko,
      en: fm.disease_en ?? "",
      aliases: Array.isArray(fm.aliases) ? fm.aliases : [],
      category: fm.category,
      urgency: fm.urgency_level,
      triggers: Array.isArray(fm.urgency_triggers) ? fm.urgency_triggers : [],
      sources: (Array.isArray(fm.sources) ? fm.sources : [])
        .filter((s) => s && s.name)
        .map((s) => s.name),
      // 수의사 감수 여부 — true면 아직 초안이다 (기본값 true: 명시 안 했으면 미감수로 본다)
      draft: String(fm.draft ?? "true") !== "false",
      reviewedBy: fm.reviewed_by ?? "",
      brief: section(body, "한 줄 요약", 260),
      signs: section(body, "🚨 지금 병원에 가야 하는 신호", 700),
      observe: section(body, "경과 관찰해도 되는 경우", 420),
      path: `kb/${cat}/${file}`,
    });
  }
}

docs.sort((a, b) => String(a.id).localeCompare(String(b.id)));

const institutions = [...new Set(docs.flatMap((d) => d.sources))].sort();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify({ generatedFrom: "kb/", docCount: docs.length, institutions, docs }, null, 1)}\n`,
  "utf8",
);

// 클라이언트 번들에 JSON 전체가 딸려가지 않도록, 화면 표시용 숫자만 담은 작은 파일을 따로 낸다
const META = join(ROOT, "lib", "kb", "meta.generated.ts");
writeFileSync(
  META,
  [
    "/* 자동 생성 파일 — 수정하지 말 것. `npm run kb:index`로 갱신된다. */",
    "",
    `export const KB_TOTAL_DOCS = ${docs.length};`,
    `export const KB_TOTAL_INSTITUTIONS = ${institutions.length};`,
    "",
  ].join("\n"),
  "utf8",
);

const reviewed = docs.filter((d) => !d.draft);
console.log(`KB 인덱스 생성: ${docs.length}개 문서, 기관 ${institutions.length}곳 → ${OUT}`);
console.log(`  수의사 감수 완료: ${reviewed.length}/${docs.length}건`);
if (reviewed.length < docs.length) {
  // 안전 우선순위: red/orange부터 감수하는 것이 효율적이다 (기준표 §0-1)
  const urgent = docs.filter((d) => d.draft && (d.urgency === "red" || d.urgency === "orange"));
  console.log(`  ⚠️ 미감수 red/orange ${urgent.length}건 — 우선 감수 대상:`);
  for (const d of urgent) console.log(`     [${d.urgency}] ${d.ko} (${d.path})`);
}
const missing = docs.filter((d) => !d.brief || !d.id);
if (missing.length) {
  console.warn(`  ⚠️ 요약/ID 누락 ${missing.length}건:`, missing.map((d) => d.path).join(", "));
}
