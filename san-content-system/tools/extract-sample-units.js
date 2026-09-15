#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const scriptRoot = path.resolve(__dirname, "..");
function resolveRoot() {
  if (fs.existsSync(path.join(scriptRoot, "03-处理状态"))) return scriptRoot;
  const rootIdx = process.argv.indexOf("--root");
  if (rootIdx !== -1 && process.argv[rootIdx + 1]) {
    const p = path.resolve(process.cwd(), process.argv[rootIdx + 1]);
    if (fs.existsSync(p)) return p;
  }
  return path.resolve(process.cwd());
}
const root = resolveRoot();
const stateRoot = path.join(root, "03-处理状态");
const sourceRoot = path.join(root, "01-原始素材区");
const unitRoot = path.join(root, "02-内容单元库");
const themeRoot = path.join(root, "05-主题地图");
const assemblyRoot = path.join(root, "06-选题装配");
const templateRoot = path.join(root, "04-模板");

const typeConfig = {
  QST: { dir: "问题单元", template: "问题单元模板.md", typeName: "问题单元" },
  CON: { dir: "概念单元", template: "概念单元模板.md", typeName: "概念单元" },
  OPI: { dir: "观点单元", template: "观点单元模板.md", typeName: "观点单元" },
  CAS: { dir: "案例单元", template: "案例单元模板.md", typeName: "案例单元" },
  SOL: { dir: "方案单元", template: "方案单元模板.md", typeName: "方案单元" },
};

const ledgerCatalog = [
  { category: "短视频", sourceType: "短视频", dirs: ["短视频/文稿"] },
  { category: "公众号", sourceType: "公众号文章", dirs: ["公众号"] },
  { category: "观点与概念", sourceType: "观点与概念", dirs: ["观点与概念"] },
  { category: "爆款文稿", sourceType: "爆款文稿", dirs: ["爆款文稿"] },
  { category: "推文", sourceType: "推文素材", dirs: ["推文"] },
  { category: "其他作者", sourceType: "外部研究素材", dirs: ["其他作者"] },
  { category: "san", sourceType: "本人内容", dirs: ["san"] },
  { category: "完整副本", sourceType: "完整副本", dirs: ["完整副本"] },
];

function usage(exitCode = 0) {
  console[exitCode === 0 ? "log" : "error"](
    [
      "用法：",
      "node 07-脚本与工具/extract-sample-units.js --files <相对路径1,相对路径2,...> [--theme 主题] [--author 作者] [--date YYYYMMDD]",
      "node 07-脚本与工具/extract-sample-units.js --plan '短视频/文稿/011.md,公众号/xxx.md'",
      "",
      "说明：本脚本是草稿生成器，不是语义抽取器。它会：",
      "  1. 解析文稿 frontmatter 和正文",
      "  2. 用通用启发式规则初筛候选句子（问题/概念/观点/案例/方案）",
      "  3. 生成 5 类内容单元草稿文件，嵌入原文摘录",
      "  4. 语义字段标记为「待AI提取」，由 AI 复核后填充",
    ].join("\n")
  );
  process.exit(exitCode);
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else {
      result[key] = next;
      i += 1;
    }
  }
  return result;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function moveFileToTrash(filePath, reasonDir) {
  if (!fs.existsSync(filePath)) return;
  const trashRoot = path.join(root, ".trash", `${new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())}_${reasonDir}`);
  const relative = path.relative(root, filePath);
  const target = path.join(trashRoot, relative);
  ensureDir(path.dirname(target));
  fs.renameSync(filePath, target);
}

function readTextSafe(file) {
  const ext = path.extname(file).toLowerCase();
  if (![".md", ".txt", ".html", ".json", ".csv", ".jsonl"].includes(ext)) return "";
  return fs.readFileSync(file, "utf8");
}

function walkLedgerFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkLedgerFiles(full));
    else if (entry.isFile() && /\.(md|txt|html|csv|json|jsonl)$/i.test(entry.name)) results.push(full);
  }
  return results;
}

function slugFromTitle(title) {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "未命名主题";
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else current += ch;
  }
  cells.push(current);
  return cells;
}

function loadRegistry() {
  const registryPath = path.join(stateRoot, "来源注册表.csv");
  const candidatePath = path.join(stateRoot, "来源注册表_批量生成候选.csv");
  const map = new Map();
  for (const file of [registryPath, candidatePath]) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    for (const line of lines.slice(1)) {
      const cells = parseCsvLine(line);
      if (cells[1] && cells[0] && !map.has(cells[1])) map.set(cells[1], cells[0]);
    }
  }
  return map;
}

function loadProcessedRows() {
  const processedPath = path.join(stateRoot, "已处理清单.csv");
  if (!fs.existsSync(processedPath)) return [["path", "status", "source_type", "notes"]];
  return fs.readFileSync(processedPath, "utf8").split("\n").filter(Boolean).map(parseCsvLine);
}

function saveProcessedRows(rows) {
  const processedPath = path.join(stateRoot, "已处理清单.csv");
  fs.writeFileSync(processedPath, rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");
}

function rebuildPendingLedger(processedSet) {
  const rawIndexPath = path.join(stateRoot, "原始素材索引.csv");
  const pendingPath = path.join(stateRoot, "待处理清单.csv");
  const rawRows = [["path", "category"]];
  const pendingRows = [["path", "status", "source_type", "notes"]];

  for (const rule of ledgerCatalog) {
    const files = rule.dirs
      .flatMap((rel) => walkLedgerFiles(path.join(sourceRoot, rel)))
      .map((file) => path.relative(sourceRoot, file).replaceAll(path.sep, "/"))
      .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

    for (const rel of files) {
      rawRows.push([rel, rule.category]);
      if (!processedSet.has(rel)) pendingRows.push([rel, "待处理", rule.sourceType, ""]);
    }
  }

  fs.writeFileSync(rawIndexPath, rawRows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");
  fs.writeFileSync(pendingPath, pendingRows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");
  return { rawCount: rawRows.length - 1, pendingCount: pendingRows.length - 1 };
}

function appendLog(lines) {
  const logPath = path.join(stateRoot, "抽取日志.md");
  const existing = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").trimEnd() : "# 抽取日志";
  fs.writeFileSync(logPath, `${existing}\n\n${lines.join("\n")}\n`);
}

function upsertStatusOverview(summary) {
  const output = path.join(stateRoot, "处理状态总览.md");
  const lines = [
    "# 处理状态总览",
    "",
    `最后更新：${summary.today}`,
    "",
    "## 当前范围",
    "",
    ...summary.scope.map((item) => `- ${item}`),
    "",
    "## 当前已完成",
    "",
    ...summary.done.map((item) => `- ${item}`),
    "",
    "## 当前未完成",
    "",
    ...summary.todo.map((item) => `- ${item}`),
    "",
    "## 下一步",
    "",
    ...summary.next.map((item) => `- ${item}`),
  ];
  fs.writeFileSync(output, lines.join("\n") + "\n");
}

function nextId(prefix, dateText) {
  if (!nextId.cache) nextId.cache = new Map();
  const cacheKey = `${prefix}-${dateText}`;
  if (nextId.cache.has(cacheKey)) {
    const current = nextId.cache.get(cacheKey) + 1;
    nextId.cache.set(cacheKey, current);
    return `${prefix}-${dateText}-${String(current).padStart(3, "0")}`;
  }
  const dir = path.join(unitRoot, typeConfig[prefix].dir);
  ensureDir(dir);
  const existing = fs.readdirSync(dir).filter((name) => name.startsWith(`${prefix}-${dateText}-`) && name.endsWith(".md"));
  let max = 0;
  for (const name of existing) {
    const match = name.match(new RegExp(`^${prefix}-${dateText}-(\\d{3})_`));
    if (match) max = Math.max(max, Number(match[1]));
  }
  const next = max + 1;
  nextId.cache.set(cacheKey, next);
  return `${prefix}-${dateText}-${String(next).padStart(3, "0")}`;
}

// ========== 文本处理工具 ==========

function removeFrontmatter(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  return normalized.replace(/^---\n[\s\S]*?\n---\n*/, "");
}

function parseFrontmatter(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return fm;
}

function stripMarkdown(text) {
  return removeFrontmatter(text)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function splitParagraphs(text) {
  return removeFrontmatter(text)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((item) => item.replace(/\n/g, " ").trim())
    .filter((item) => item.length >= 10);
}

function splitSentences(text, minLen = 8) {
  const stripped = stripMarkdown(text);
  return stripped
    .split(/[。！？!?；;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLen);
}

function cleanSentence(text) {
  return stripMarkdown(text).replace(/[。；：、]+$/, "").trim();
}

function truncateText(text, max = 120) {
  const normalized = stripMarkdown(text);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}……`;
}

function normalizeKeywords(items) {
  const result = [];
  for (const item of items) {
    const normalized = stripMarkdown(String(item || "")).replace(/[，、]/g, " ").trim();
    if (!normalized) continue;
    for (const token of normalized.split(/\s+/)) {
      const clean = token.trim();
      if (!clean || clean.length < 2) continue;
      if (!result.includes(clean)) result.push(clean);
      if (result.length >= 8) return result;
    }
  }
  return result;
}

function dedupeBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }
  return [...map.values()];
}

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

// ========== 文稿解析 ==========

function cleanTitleFromFilename(filename) {
  // 去掉日期前缀 (20260805-) 和版本后缀 (-v2)
  return filename
    .replace(/^\d{6,8}[-_]/, "")
    .replace(/[-_]v\d+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function extractTitle(relPath, rawText, frontmatter) {
  // 优先从 frontmatter title 字段提取
  if (frontmatter.title) {
    let title = frontmatter.title;
    // 去掉日期前缀和类型前缀
    title = title.replace(/^\d{6,8}[-_]/, "").replace(/^口播[-_：:]?\s*/, "").replace(/[-_]v\d+$/i, "").trim();
    if (title.length >= 4) return title;
  }
  // 其次找第一个 H1/H2 标题
  const body = removeFrontmatter(rawText);
  const headingMatch = body.match(/^#{1,2}\s+(.+)$/m);
  if (headingMatch) {
    let title = headingMatch[1].replace(/^口播逐字稿[：:]\s*/, "").trim();
    if (title.length >= 4) return title;
  }
  // 最后从文件名提取
  return cleanTitleFromFilename(path.basename(relPath, path.extname(relPath)));
}

function extractBodyContent(rawText) {
  // 去掉 frontmatter
  let body = removeFrontmatter(rawText);
  // 去掉写作说明、质检报告等元数据区块（从 ## 写作说明 或 ## 四关质检 开始截断）
  body = body.replace(/\n##\s*(写作说明|四关质检|质检报告|创作笔记|修改记录)[\s\S]*$/i, "");
  return body.trim();
}

function classifySource(relPath, rawText) {
  const ext = path.extname(relPath).toLowerCase();
  const normalized = String(rawText || "");
  const stripped = stripMarkdown(normalized);
  const lineCount = removeFrontmatter(normalized).split("\n").length;
  const paragraphCount = splitParagraphs(normalized).length;
  const headingCount = countMatches(normalized, /^#{1,6}\s+/gm);
  const hasJsonSignals = /"[^"]+"\s*:/.test(normalized);
  const hasCsvSignals = ext === ".csv" || /^".+?",".+?"/m.test(normalized);
  const hasTweetMarkers = /tweet|推文|转发|回复|主贴|thread/i.test(`${relPath}\n${normalized}`);
  const hasBatchSignals = /batch_\d+|annotated|cleaned|analysis report|content library|insights collection|quality report/i.test(
    `${relPath}\n${normalized}`
  );
  const hasMissingTextSignals = /missing_text|缺正文推文清单|来源：quality_report/i.test(`${relPath}\n${normalized}`);
  const hasReadableLongform = headingCount >= 1 || paragraphCount >= 4 || stripped.length >= 400;

  if (ext === ".json" || ext === ".jsonl" || hasJsonSignals) return { kind: "skip", reason: "结构化中间文件" };
  if (hasCsvSignals) return { kind: "skip", reason: "表格索引文件" };
  if (/README\.md$/i.test(relPath)) return { kind: "skip", reason: "说明文件" };
  if (hasBatchSignals) return { kind: "skip", reason: "推文处理中间产物" };
  if (hasMissingTextSignals) return { kind: "skip", reason: "缺正文索引或质量报告" };
  if (hasTweetMarkers && stripped.length > 400) return { kind: "normalize-tweet-archive", reason: "推文合集或导出长卷" };
  if (hasReadableLongform && stripped.length >= 200) return { kind: "extract-article", reason: "结构较完整的成稿" };
  if (stripped.length >= 80) return { kind: "extract-short-draft", reason: "可抽取短稿" };
  return { kind: "skip", reason: "信息密度不足或不适合直接抽取" };
}

// ========== 通用启发式抽取 ==========

function heuristicExtract(body, title) {
  const paragraphs = splitParagraphs(body);
  const sentences = splitSentences(body, 8);
  const shortSentences = splitSentences(body, 4); // 概念句可能很短，如"我管这个叫散件"

  // QST: 找含疑问词或问号的句子
  const questionSentences = sentences.filter(
    (s) => /[？?]/.test(s) || /为什么|怎么|如何|怎样|是不是|能不能|该不该|要不要|有没有|怎么办|什么是|何为/.test(s)
  );

  // CON: 找定义句（"是指""就是""意味着""本质是""区别""我管这个叫"），包括短句
  const conceptSentences = [...sentences, ...shortSentences].filter(
    (s) => /是指|就是|意味着|本质是|区别于|不同于|我管这个叫|我称之为|叫做|称为|定义/.test(s)
  );

  // OPI: 找判断句（"不是…而是""关键是""核心是""本质上""必须""应该"）
  const opinionSentences = sentences.filter(
    (s) => /不是.{2,20}而是|关键是|核心是|本质上|根本|真正|必须|应该|不要|从来不是|问题就出在|顺序不能反/.test(s)
  );

  // CAS: 找含数字、案例标志的段落
  const caseParagraphs = paragraphs.filter(
    (p) => /\d+[%万亿千百]|比如|例如|案例|真事|有个|有人|我学员|结果|后来|发现/.test(p)
  );

  // SOL: 找步骤句（"首先""其次""然后""最后""第一步""先…再"）
  const solutionSentences = sentences.filter(
    (s) => /首先|其次|然后|最后|第一步|第二步|第三步|先.{2,15}再|步骤|方法是|路径是/.test(s)
  );

  // 提取正文前几段作为原文摘录（过滤掉标题行）
  const excerptParagraphs = paragraphs
    .filter((p) => !/^#{1,6}\s/.test(p) && !/^口播逐字稿[：:]/.test(p))
    .slice(0, 6);

  return {
    title,
    questionCandidates: questionSentences.slice(0, 5),
    conceptCandidates: conceptSentences.slice(0, 5),
    opinionCandidates: opinionSentences.slice(0, 5),
    caseCandidates: caseParagraphs.slice(0, 3).map((p) => truncateText(p, 200)),
    solutionCandidates: solutionSentences.slice(0, 5),
    excerpts: excerptParagraphs.map((p) => truncateText(p, 300)),
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
  };
}

function normalizeTweetArchive(relPath, rawText) {
  const paragraphs = splitParagraphs(rawText);
  const longParagraphs = paragraphs
    .filter((item) => stripMarkdown(item).length >= 60 && !/^原链接[:：]/i.test(item) && !/^\d{4}-\d{2}-\d{2}/.test(item))
    .slice(0, 12);
  return longParagraphs.map((item, index) => ({
    relPath: `${relPath}#chunk-${String(index + 1).padStart(2, "0")}`,
    title: truncateText(stripMarkdown(item).split(/[。！？]/)[0] || `推文片段 ${index + 1}`, 28),
    text: item,
  }));
}

// ========== 候选单元构建（通用版） ==========

function buildCandidates(heuristic, theme) {
  const candidates = { QST: [], CON: [], OPI: [], CAS: [], SOL: [] };
  const aiNote = "（脚本初筛，需AI提取）";

  // QST: 主问题
  const mainQuestion = heuristic.questionCandidates[0]
    ? cleanSentence(heuristic.questionCandidates[0])
    : `${heuristic.title} 试图回答什么核心问题？`;
  candidates.QST.push({
    key: "qst-main",
    title: truncateText(mainQuestion, 28),
    questionText: mainQuestion.endsWith("？") || mainQuestion.endsWith("?") ? mainQuestion : `${mainQuestion}？`,
    questionType: /为什么|本质|根本|误区|错在/.test(mainQuestion) ? "认知问题" : /怎么|如何|怎样|步骤|路径|落地/.test(mainQuestion) ? "方法问题" : "待人工复核",
    applicableTopics: [theme].filter(Boolean),
    bodyText: [
      `核心问题：${mainQuestion}${aiNote}`,
      heuristic.questionCandidates.length > 1
        ? `其他候选问题：\n${heuristic.questionCandidates.slice(1, 4).map((q) => `- ${cleanSentence(q)}`).join("\n")}`
        : "（脚本未找到更多候选问题，AI 可从原文摘录中提炼）",
    ].join("\n\n"),
    usageScenarios: ["待AI补全"],
  });

  // CON: 关键概念
  const mainConcept = heuristic.conceptCandidates[0]
    ? cleanSentence(heuristic.conceptCandidates[0])
    : "";
  const conTitle = mainConcept ? truncateText(mainConcept, 28) : "核心概念提取";
  candidates.CON.push({
    key: "con-main",
    title: conTitle,
    conceptDefinition: mainConcept ? `${mainConcept}${aiNote}` : `待AI从原文中提取核心概念定义`,
    conceptFunction: mainConcept ? "用于解释核心观点中的关键概念" : "待AI补全：这个概念解释了什么、区分了什么",
    bodyText: [
      `概念定义：${heuristic.conceptCandidates[0] ? mainConcept + aiNote : "待AI提取"}`,
      heuristic.conceptCandidates.length > 1
        ? `其他候选概念句：\n${heuristic.conceptCandidates.slice(1, 4).map((c) => `- ${cleanSentence(c)}`).join("\n")}`
        : "（脚本未找到更多概念句，AI 可从原文摘录中提炼）",
    ].join("\n\n"),
    usageScenarios: ["待AI补全"],
    relationshipRefs: [
      { type: "解释", targetKey: "opi-main", note: "概念解释核心观点" },
    ],
  });

  // OPI: 核心观点
  const mainOpinion = heuristic.opinionCandidates[0]
    ? cleanSentence(heuristic.opinionCandidates[0])
    : `${heuristic.title} 的核心判断是什么？`;
  candidates.OPI.push({
    key: "opi-main",
    title: truncateText(mainOpinion, 28),
    coreClaim: heuristic.opinionCandidates[0] ? `${mainOpinion}${aiNote}` : `待AI从原文中提取核心判断`,
    claimScope: "待AI补全",
    whyItMatters: "待AI补全：这条判断解决了什么认知问题",
    bodyText: [
      `核心判断：${heuristic.opinionCandidates[0] ? mainOpinion + aiNote : "待AI提取"}`,
      heuristic.opinionCandidates.length > 1
        ? `其他候选观点句：\n${heuristic.opinionCandidates.slice(1, 5).map((o) => `- ${cleanSentence(o)}`).join("\n")}`
        : "（脚本未找到更多观点句，AI 可从原文摘录中提炼）",
    ].join("\n\n"),
    usageScenarios: ["待AI补全"],
    relationshipRefs: [
      { type: "回应", targetKey: "qst-main", note: "观点回应主问题" },
    ],
  });

  // CAS: 关键案例
  const mainCase = heuristic.caseCandidates[0] || "";
  const caseTitle = mainCase
    ? truncateText(mainCase.split(/[。！？，,]/)[0] || mainCase, 24)
    : "关键案例提取";
  candidates.CAS.push({
    key: "cas-main",
    title: caseTitle,
    caseSubject: mainCase ? truncateText(mainCase, 60) : "待AI从原文中提取案例主体",
    caseSummary: mainCase ? `${truncateText(mainCase, 100)}${aiNote}` : "待AI提取",
    caseProcess: heuristic.caseCandidates[1] ? truncateText(heuristic.caseCandidates[1], 120) : "待AI提取",
    caseResult: heuristic.caseCandidates[2] ? truncateText(heuristic.caseCandidates[2], 120) : "待AI提取",
    bodyText: [
      `案例摘要：${mainCase ? truncateText(mainCase, 150) + aiNote : "待AI提取"}`,
      heuristic.caseCandidates.length > 1
        ? `其他候选案例段落：\n${heuristic.caseCandidates.slice(1, 3).map((c) => `- ${truncateText(c, 100)}`).join("\n")}`
        : "（脚本未找到更多案例段落，AI 可从原文摘录中提炼）",
    ].join("\n\n"),
    usageScenarios: ["待AI补全"],
    relationshipRefs: [
      { type: "证明", targetKey: "opi-main", note: "案例证明主观点" },
    ],
  });

  // SOL: 方案
  const mainSolution = heuristic.solutionCandidates[0]
    ? cleanSentence(heuristic.solutionCandidates[0])
    : `${heuristic.title} 对应的行动方案是什么？`;
  const actionSteps = heuristic.solutionCandidates.length > 0
    ? heuristic.solutionCandidates.slice(0, 5).map((s) => `${cleanSentence(s)}${aiNote}`)
    : ["待AI补全步骤 1", "待AI补全步骤 2", "待AI补全步骤 3"];
  candidates.SOL.push({
    key: "sol-main",
    title: truncateText(mainSolution, 28),
    targetProblem: mainQuestion,
    solutionSummary: heuristic.solutionCandidates[0] ? `${mainSolution}${aiNote}` : "待AI从原文中提取方案摘要",
    actionSteps,
    expectedResult: "待AI补全",
    bodyText: [
      `方案摘要：${heuristic.solutionCandidates[0] ? mainSolution + aiNote : "待AI提取"}`,
      actionSteps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    ].join("\n\n"),
    usageScenarios: ["待AI补全"],
    relationshipRefs: [
      { type: "回应", targetKey: "qst-main", note: "方案回应主问题" },
      { type: "承接", targetKey: "opi-main", note: "方案落地核心观点" },
    ],
  });

  return candidates;
}

// ========== 模板应用与文件写入 ==========

function applyTemplate(prefix, data) {
  const templatePath = path.join(templateRoot, typeConfig[prefix].template);
  let content = fs.readFileSync(templatePath, "utf8");
  const formattedDate = `${data.date.slice(0, 4)}-${data.date.slice(4, 6)}-${data.date.slice(6, 8)}`;

  content = content
    .replace(`${prefix}-YYYYMMDD-001`, data.id)
    .replace(/^title:\s*标题$/m, `title: ${data.title}`)
    .replace(/^created_at:\s*YYYY-MM-DD$/m, `created_at: ${formattedDate}`)
    .replace(/^updated_at:\s*YYYY-MM-DD$/m, `updated_at: ${formattedDate}`)
    .replace(/^source_documents:\n(?:  - .+\n)+/m, `source_documents:\n  - ${data.sourceId}\n`)
    .replace(/^source_authors:\n(?:  - .+\n)+/m, `source_authors:\n  - ${data.author}\n`)
    .replace(/^themes:\n(?:  - .+\n)+/m, `themes:\n  - ${data.theme}\n`)
    .replace(
      /^keywords:\n(?:  - .+\n)+/m,
      `keywords:\n${data.keywords.map((item) => `  - ${item}`).join("\n")}\n`
    );

  if (prefix === "QST") {
    content = content
      .replace(/^question_text:\s*问题原句$/m, `question_text: ${data.questionText}`)
      .replace(/^question_type:\s*认知问题$/m, `question_type: ${data.questionType}`)
      .replace(
        /^applicable_topics:\n(?:  - .+\n)+/m,
        `applicable_topics:\n${data.applicableTopics.map((item) => `  - ${item}`).join("\n")}\n`
      );
  }

  if (prefix === "CON") {
    content = content
      .replace(/^concept_definition:\s*概念定义$/m, `concept_definition: ${data.conceptDefinition}`)
      .replace(/^concept_function:\s*解释什么$/m, `concept_function: ${data.conceptFunction}`);
  }

  if (prefix === "OPI") {
    content = content
      .replace(/^core_claim:\s*核心判断$/m, `core_claim: ${data.coreClaim}`)
      .replace(/^claim_scope:\s*适用范围$/m, `claim_scope: ${data.claimScope}`)
      .replace(/^why_it_matters:\s*为什么重要$/m, `why_it_matters: ${data.whyItMatters}`);
  }

  if (prefix === "CAS") {
    content = content
      .replace(/^case_subject:\s*案例主体$/m, `case_subject: ${data.caseSubject}`)
      .replace(/^case_summary:\s*案例摘要$/m, `case_summary: ${data.caseSummary}`)
      .replace(/^case_process:\s*关键过程$/m, `case_process: ${data.caseProcess}`)
      .replace(/^case_result:\s*结果$/m, `case_result: ${data.caseResult}`);
  }

  if (prefix === "SOL") {
    content = content
      .replace(/^target_problem:\s*解决什么问题$/m, `target_problem: ${data.targetProblem}`)
      .replace(/^solution_summary:\s*方案摘要$/m, `solution_summary: ${data.solutionSummary}`)
      .replace(
        /^action_steps:\n(?:  - .+\n)+/m,
        `action_steps:\n${data.actionSteps.map((item) => `  - ${item}`).join("\n")}\n`
      )
      .replace(/^expected_result:\s*预期结果$/m, `expected_result: ${data.expectedResult}`);
  }

  if (data.relationships && data.relationships.length > 0) {
    content = content.replace(
      /^relationships:\s*\[\]$/m,
      `relationships:\n${data.relationships
        .map((item) => `  - type: ${item.type}\n    target: ${item.target}\n    note: ${item.note}`)
        .join("\n")}`
    );
  }

  // 核心内容 + 原文摘录
  const bodyWithExcerpts = [
    data.bodyText,
    "",
    "### 原文摘录（供AI提取参考）",
    "",
    ...data.excerpts.map((p, i) => `${i + 1}. ${p}`),
  ].join("\n");

  content = content.replace(/^## 核心内容$/m, `## 核心内容\n\n${bodyWithExcerpts}\n`);
  content = content.replace(
    /^## 来源依据$/m,
    `## 来源依据\n\n- 来源文件：${data.sourceRel}\n- 来源类型：${data.sourceType}\n`
  );
  content = content.replace(
    /^## 使用场景$/m,
    `## 使用场景\n\n${data.usageScenarios.map((item) => `- ${item}`).join("\n")}\n`
  );

  return content;
}

function writeUnit(prefix, data) {
  const dir = path.join(unitRoot, typeConfig[prefix].dir);
  ensureDir(dir);
  const existingFiles = findExistingUnitFiles(prefix, data.title, data.sourceId, data.sourceRel);
  const normalizedTargetPath = path.join(dir, `${data.id}_${slugFromTitle(data.title)}.md`);
  let targetPath = normalizedTargetPath;
  if (existingFiles[0]) {
    targetPath = existingFiles[0];
    if (targetPath !== normalizedTargetPath) {
      if (fs.existsSync(normalizedTargetPath) && normalizedTargetPath !== targetPath) {
        moveFileToTrash(normalizedTargetPath, "重复单元清理");
      }
      fs.renameSync(targetPath, normalizedTargetPath);
      targetPath = normalizedTargetPath;
    }
  }
  for (const staleFile of existingFiles.slice(1)) moveFileToTrash(staleFile, "重复单元清理");
  fs.writeFileSync(targetPath, applyTemplate(prefix, data));
  return targetPath;
}

function readFrontmatterValue(content, field) {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

function readFrontmatterList(content, field) {
  const match = content.match(new RegExp(`^${field}:\\n((?:\\s+-\\s+.+\\n?)*)`, "m"));
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim().replace(/^- /, "").trim())
    .filter(Boolean);
}

function findExistingUnitFiles(prefix, title, sourceId, sourceRel) {
  const dir = path.join(unitRoot, typeConfig[prefix].dir);
  if (!fs.existsSync(dir)) return [];
  const matches = [];
  for (const name of fs.readdirSync(dir).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))) {
    if (!name.endsWith(".md")) continue;
    const filePath = path.join(dir, name);
    const content = fs.readFileSync(filePath, "utf8");
    const existingTitle = readFrontmatterValue(content, "title");
    if (existingTitle !== title) continue;
    const sourceDocuments = readFrontmatterList(content, "source_documents");
    const sourceLines = content.match(/^-\s*来源文件：(.+)$/m);
    const existingSourceRel = sourceLines ? sourceLines[1].trim() : "";
    if (sourceDocuments.includes(sourceId) || existingSourceRel === sourceRel) matches.push(filePath);
  }
  return matches;
}

function resolveUnitIdentity(prefix, title, sourceId, sourceRel, dateText) {
  const existingFiles = findExistingUnitFiles(prefix, title, sourceId, sourceRel);
  if (existingFiles.length > 0) {
    const firstExistingId = readFrontmatterValue(fs.readFileSync(existingFiles[0], "utf8"), "id");
    return {
      id: firstExistingId || path.basename(existingFiles[0], ".md").split("_")[0] || nextId(prefix, dateText),
      existingFiles,
    };
  }
  return {
    id: nextId(prefix, dateText),
    existingFiles: [],
  };
}

// ========== 主题地图与装配稿 ==========

function loadExistingThemeMap(theme) {
  const filePath = path.join(themeRoot, `${slugFromTitle(theme)}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

function extractLinkedItems(content, heading) {
  const match = content.match(new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
  if (!match) return [];
  return [...match[1].matchAll(/\[\[([^\]]+)\]\]/g)].map((item) => `[[${item[1]}]]`);
}

function findUnitFileByBasename(basename) {
  if (!findUnitFileByBasename.cache) findUnitFileByBasename.cache = new Map();
  if (findUnitFileByBasename.cache.has(basename)) return findUnitFileByBasename.cache.get(basename);
  for (const config of Object.values(typeConfig)) {
    const candidate = path.join(unitRoot, config.dir, `${basename}.md`);
    if (fs.existsSync(candidate)) {
      findUnitFileByBasename.cache.set(basename, candidate);
      return candidate;
    }
  }
  findUnitFileByBasename.cache.set(basename, "");
  return "";
}

function linkedItemExists(linkedItem) {
  const basename = linkedItem.replace(/^\[\[|\]\]$/g, "");
  return Boolean(findUnitFileByBasename(basename));
}

function ensureThemeMap(theme, overview, unitIndex, sourceId, sourceRel) {
  ensureDir(themeRoot);
  const filePath = path.join(themeRoot, `${slugFromTitle(theme)}.md`);
  const existing = loadExistingThemeMap(theme);
  const buckets = {
    "核心问题单元": [],
    "核心概念单元": [],
    "核心观点单元": [],
    "核心案例单元": [],
    "核心方案单元": [],
  };

  if (existing) {
    for (const heading of Object.keys(buckets)) {
      buckets[heading] = extractLinkedItems(existing, heading).filter(
        (item) => linkedItemExists(item)
      );
    }
  }

  const appendUnique = (heading, link) => {
    if (!link) return;
    const wrapped = `[[${link}]]`;
    if (!buckets[heading].includes(wrapped)) buckets[heading].push(wrapped);
  };

  appendUnique("核心问题单元", unitIndex.primary.QST);
  for (const link of unitIndex.all.QST) appendUnique("核心问题单元", link);
  appendUnique("核心概念单元", unitIndex.primary.CON);
  for (const link of unitIndex.all.CON) appendUnique("核心概念单元", link);
  appendUnique("核心观点单元", unitIndex.primary.OPI);
  for (const link of unitIndex.all.OPI) appendUnique("核心观点单元", link);
  appendUnique("核心案例单元", unitIndex.primary.CAS);
  for (const link of unitIndex.all.CAS) appendUnique("核心案例单元", link);
  appendUnique("核心方案单元", unitIndex.primary.SOL);
  for (const link of unitIndex.all.SOL) appendUnique("核心方案单元", link);

  const lines = [
    `# 主题地图：${theme}`,
    "",
    "## 主题定义",
    "",
    overview.themeDefinition,
    "",
    "## 核心问题单元",
    "",
    ...(buckets["核心问题单元"].length > 0 ? buckets["核心问题单元"] : ["- 待补"]),
    "",
    "## 核心概念单元",
    "",
    ...(buckets["核心概念单元"].length > 0 ? buckets["核心概念单元"] : ["- 待补"]),
    "",
    "## 核心观点单元",
    "",
    ...(buckets["核心观点单元"].length > 0 ? buckets["核心观点单元"] : ["- 待补"]),
    "",
    "## 核心案例单元",
    "",
    ...(buckets["核心案例单元"].length > 0 ? buckets["核心案例单元"] : ["- 待补"]),
    "",
    "## 核心方案单元",
    "",
    ...(buckets["核心方案单元"].length > 0 ? buckets["核心方案单元"] : ["- 待补"]),
    "",
    "## 常见装配路径",
    "",
    `1. 问题：${overview.pathQuestion}`,
    `2. 概念：${overview.pathConcept}`,
    `3. 观点：${overview.pathOpinion}`,
    `4. 案例：${overview.pathCase}`,
    `5. 方案：${overview.pathSolution}`,
    "",
    "## 同主题可继续重组的补充单元",
    "",
    `- 补充问题：${overview.extraQuestions.length > 0 ? overview.extraQuestions.map((item) => `[[${item}]]`).join("、") : "暂无"}`,
    `- 补充观点：${overview.extraOpinions.length > 0 ? overview.extraOpinions.map((item) => `[[${item}]]`).join("、") : "暂无"}`,
    `- 补充案例：${overview.extraCases.length > 0 ? overview.extraCases.map((item) => `[[${item}]]`).join("、") : "暂无"}`,
    `- 补充方案：${overview.extraSolutions.length > 0 ? overview.extraSolutions.map((item) => `[[${item}]]`).join("、") : "暂无"}`,
    "",
    "## 相关主题",
    "",
    ...(overview.relatedThemes.length > 0 ? overview.relatedThemes.map((item) => `- ${item}`) : ["- 待补"]),
  ];

  fs.writeFileSync(filePath, lines.join("\n") + "\n");
  return filePath;
}

function ensureAssembly(title, overview, unitIndex) {
  ensureDir(assemblyRoot);
  const datePrefix = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const filePath = path.join(assemblyRoot, `${datePrefix}_${slugFromTitle(title)}_装配稿.md`);
  const lines = [
    `# 选题装配：${title}`,
    "",
    "## 目标受众",
    "",
    overview.audience,
    "",
    "## 装配理由",
    "",
    overview.assemblyReason,
    "",
    "## 核心调用单元",
    "",
    "### 问题",
    "",
    unitIndex.primary.QST ? `- [[${unitIndex.primary.QST}]]` : "- 待补",
    "",
    "### 概念",
    "",
    unitIndex.primary.CON ? `- [[${unitIndex.primary.CON}]]` : "- 待补",
    "",
    "### 观点",
    "",
    unitIndex.primary.OPI ? `- [[${unitIndex.primary.OPI}]]` : "- 待补",
    "",
    "### 案例",
    "",
    unitIndex.primary.CAS ? `- [[${unitIndex.primary.CAS}]]` : "- 待补",
    "",
    "### 方案",
    "",
    unitIndex.primary.SOL ? `- [[${unitIndex.primary.SOL}]]` : "- 待补",
    "",
    "## 可追加调用单元",
    "",
    `- 补充问题：${overview.extraQuestions.length > 0 ? overview.extraQuestions.map((item) => `[[${item}]]`).join("、") : "暂无"}`,
    `- 补充观点：${overview.extraOpinions.length > 0 ? overview.extraOpinions.map((item) => `[[${item}]]`).join("、") : "暂无"}`,
    `- 补充案例：${overview.extraCases.length > 0 ? overview.extraCases.map((item) => `[[${item}]]`).join("、") : "暂无"}`,
    `- 补充方案：${overview.extraSolutions.length > 0 ? overview.extraSolutions.map((item) => `[[${item}]]`).join("、") : "暂无"}`,
    "",
    "## 建议结构",
    "",
    `1. 痛点：${overview.structure[0]}`,
    `2. 冲突：${overview.structure[1]}`,
    `3. 展开：${overview.structure[2]}`,
    `4. 案例：${overview.structure[3]}`,
    `5. 方法：${overview.structure[4]}`,
    `6. 收束：${overview.structure[5]}`,
    "",
    "## 表达骨架",
    "",
    `### 开头\n\n${overview.bones.opening}`,
    "",
    `### 中段 1\n\n${overview.bones.body1}`,
    "",
    `### 中段 2\n\n${overview.bones.body2}`,
    "",
    `### 中段 3\n\n${overview.bones.body3}`,
    "",
    `### 结尾\n\n${overview.bones.closing}`,
  ];
  fs.writeFileSync(filePath, lines.join("\n") + "\n");
  return filePath;
}

function buildUnitOverview(heuristic, theme, candidateBuckets, unitIndex) {
  const primaryQuestion = candidateBuckets.QST[0];
  const primaryConcept = candidateBuckets.CON[0];
  const primaryOpinion = candidateBuckets.OPI[0];
  const primaryCase = candidateBuckets.CAS[0];
  const primarySolution = candidateBuckets.SOL[0];

  return {
    themeDefinition: "待AI根据单元内容提炼主题定义",
    pathQuestion: primaryQuestion?.questionText || "待补",
    pathConcept: primaryConcept?.conceptDefinition || "待补",
    pathOpinion: primaryOpinion?.coreClaim || "待补",
    pathCase: primaryCase?.caseSummary || "待补",
    pathSolution: primarySolution?.solutionSummary || "待补",
    relatedThemes: [],
    audience: "待AI根据内容定位目标受众",
    assemblyReason: `围绕「${theme}」主题，脚本已生成 5 类单元草稿，需 AI 复核语义字段后装配。`,
    structure: [
      primaryQuestion?.questionText || "待补",
      primaryOpinion?.coreClaim || "待补",
      primaryConcept?.conceptDefinition || "待补",
      primaryCase?.caseSummary || "待补",
      primarySolution?.solutionSummary || "待补",
      "待AI补全收束句",
    ],
    bones: {
      opening: primaryQuestion?.questionText || "待补",
      body1: primaryConcept?.conceptDefinition || "待补",
      body2: primaryOpinion?.coreClaim || "待补",
      body3: primarySolution?.solutionSummary || "待补",
      closing: "待AI补全",
    },
    extraQuestions: [],
    extraOpinions: [],
    extraCases: [],
    extraSolutions: [],
  };
}

// ========== 主流程 ==========

function buildPayload(prefix, candidate, sourceMeta, heuristic, dateText) {
  const identity = resolveUnitIdentity(prefix, candidate.title, sourceMeta.sourceId, sourceMeta.sourceRel, dateText);
  // 关键词提取前去掉 aiNote 标记
  const stripNote = (s) => String(s || "").replace(/（脚本初筛，需AI提取）/g, "").replace(/\(脚本初筛，需AI提取\)/g, "").trim();
  const keywords = normalizeKeywords([
    sourceMeta.title,
    sourceMeta.theme,
    stripNote(candidate.title),
    stripNote(candidate.questionText),
    stripNote(candidate.coreClaim),
    stripNote(candidate.conceptDefinition),
    stripNote(candidate.caseSummary),
    stripNote(candidate.solutionSummary),
    ...(candidate.actionSteps || []).map(stripNote),
  ]);

  const payloadBase = {
    id: identity.id,
    sourceId: sourceMeta.sourceId,
    author: sourceMeta.author,
    theme: sourceMeta.theme,
    keywords: keywords.length > 0 ? keywords.slice(0, 8) : ["待补关键词"],
    date: dateText,
    sourceRel: sourceMeta.sourceRel,
    sourceType: sourceMeta.sourceType,
    relationships: [],
    usageScenarios: candidate.usageScenarios || ["待AI补全"],
    excerpts: heuristic.excerpts,
  };

  let payload;
  if (prefix === "QST") {
    payload = {
      ...payloadBase,
      title: candidate.title,
      questionText: candidate.questionText,
      questionType: candidate.questionType,
      applicableTopics: candidate.applicableTopics?.length > 0 ? candidate.applicableTopics : [sourceMeta.theme],
      bodyText: candidate.bodyText,
    };
  } else if (prefix === "CON") {
    payload = {
      ...payloadBase,
      title: candidate.title,
      conceptDefinition: candidate.conceptDefinition,
      conceptFunction: candidate.conceptFunction,
      bodyText: candidate.bodyText,
    };
  } else if (prefix === "OPI") {
    payload = {
      ...payloadBase,
      title: candidate.title,
      coreClaim: candidate.coreClaim,
      claimScope: candidate.claimScope,
      whyItMatters: candidate.whyItMatters,
      bodyText: candidate.bodyText,
    };
  } else if (prefix === "CAS") {
    payload = {
      ...payloadBase,
      title: candidate.title,
      caseSubject: candidate.caseSubject,
      caseSummary: candidate.caseSummary,
      caseProcess: candidate.caseProcess,
      caseResult: candidate.caseResult,
      bodyText: candidate.bodyText,
    };
  } else {
    payload = {
      ...payloadBase,
      title: candidate.title,
      targetProblem: candidate.targetProblem,
      solutionSummary: candidate.solutionSummary,
      actionSteps: candidate.actionSteps,
      expectedResult: candidate.expectedResult,
      bodyText: candidate.bodyText,
    };
  }

  candidate.payload = payload;
  candidate.existingFiles = identity.existingFiles;
  return identity.id;
}

function extractUnitsFromHeuristic(heuristic, sourceMeta, dateText, createdUnits) {
  const candidateBuckets = buildCandidates(heuristic, sourceMeta.theme);
  const unitIndex = {
    primary: {},
    all: { QST: [], CON: [], OPI: [], CAS: [], SOL: [] },
  };
  const keyToId = new Map();
  const bucketOrder = ["QST", "CON", "OPI", "CAS", "SOL"];

  for (const prefix of bucketOrder) {
    for (const candidate of candidateBuckets[prefix]) {
      const id = buildPayload(prefix, candidate, sourceMeta, heuristic, dateText);
      keyToId.set(candidate.key, id);
    }
  }

  for (const prefix of bucketOrder) {
    for (const candidate of candidateBuckets[prefix]) {
      candidate.payload.relationships = (candidate.relationshipRefs || [])
        .map((item) => {
          const targetId = keyToId.get(item.targetKey);
          if (!targetId) return null;
          return { type: item.type, target: targetId, note: item.note };
        })
        .filter(Boolean);
      const filePath = writeUnit(prefix, candidate.payload);
      const basename = path.basename(filePath, ".md");
      unitIndex.all[prefix].push(basename);
      if (!unitIndex.primary[prefix]) unitIndex.primary[prefix] = basename;
      createdUnits.push(path.relative(root, filePath).replaceAll(path.sep, "/"));
    }
  }

  return { candidateBuckets, unitIndex };
}

function inferSourceType(relPath) {
  if (relPath.includes("推文")) return "推文素材";
  if (relPath.includes("短视频")) return "短视频";
  if (relPath.includes("公众号")) return "公众号文章";
  if (relPath.includes("爆款文稿")) return "爆款文稿";
  if (relPath.includes("观点与概念")) return "观点与概念";
  if (relPath.includes("其他作者")) return "外部研究素材";
  if (relPath.includes("完整副本")) return "本人内容";
  return "原始素材";
}

// ========== 入口 ==========

const args = parseArgs(process.argv.slice(2));
if (args.help) usage(0);

let fileList = [];
if (args.files) fileList = args.files.split(",").map((item) => item.trim()).filter(Boolean);
if (args.plan) fileList = args.plan.split(",").map((item) => item.trim()).filter(Boolean);
if (fileList.length === 0) usage(1);

const registry = loadRegistry();
const processedRows = loadProcessedRows();
const processedSet = new Set(processedRows.slice(1).map((row) => row[0]));
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const dateText = (args.date || today.replaceAll("-", "")).trim();
if (!/^\d{8}$/.test(dateText)) {
  console.error("date 必须是 YYYYMMDD");
  process.exit(1);
}

const createdUnits = [];
const logLines = [`## ${today} 样本抽取`, ""];
const processedNow = [];
const skippedNow = [];
const skippedByClassifier = [];

for (const relPath of fileList) {
  if (processedSet.has(relPath)) {
    skippedNow.push(relPath);
    continue;
  }

  const sourcePath = path.join(sourceRoot, relPath);
  if (!fs.existsSync(sourcePath)) {
    console.error(`样本不存在：${relPath}`);
    process.exit(1);
  }

  const rawText = readTextSafe(sourcePath);
  if (!rawText.trim()) {
    console.error(`样本文稿无法读取文本：${relPath}`);
    process.exit(1);
  }

  const frontmatter = parseFrontmatter(rawText);
  const title = extractTitle(relPath, rawText, frontmatter);
  const author = args.author || frontmatter.author || "待补";
  const sourceId = registry.get(relPath) || "SRC-*";
  const profile = classifySource(relPath, rawText);

  if (profile.kind === "skip") {
    processedRows.push([relPath, `已跳过：${profile.reason}`, inferSourceType(relPath), `分类器跳过于 ${today}`]);
    processedSet.add(relPath);
    skippedByClassifier.push(relPath);
    logLines.push(`- 样本：${relPath}`);
    logLines.push(`  - 分类：跳过`);
    logLines.push(`  - 原因：${profile.reason}`);
    continue;
  }

  const extractionItems =
    profile.kind === "normalize-tweet-archive"
      ? normalizeTweetArchive(relPath, rawText)
      : [{ relPath, title, text: extractBodyContent(rawText) }];

  let sourceCreatedCount = 0;
  const sourceThemes = [];
  const sourceAssemblies = [];
  const generatedUnitNames = [];

  for (const item of extractionItems) {
    const itemTitle = item.title || title;
    const itemText = item.text || extractBodyContent(rawText);
    const heuristic = heuristicExtract(itemText, itemTitle);
    const displayTitle = heuristic.title || itemTitle;

    const theme = args.theme || displayTitle;
    const sourceMeta = {
      title: displayTitle,
      author,
      sourceId,
      sourceRel: relPath,
      sourceType: inferSourceType(relPath),
      theme,
    };

    const { candidateBuckets, unitIndex } = extractUnitsFromHeuristic(heuristic, sourceMeta, dateText, createdUnits);
    const overview = buildUnitOverview(heuristic, theme, candidateBuckets, unitIndex);
    const themeFile = ensureThemeMap(theme, overview, unitIndex, sourceId, relPath);
    const assemblyFile = ensureAssembly(displayTitle, overview, unitIndex);

    sourceCreatedCount += Object.values(unitIndex.all).flat().length;
    sourceThemes.push(path.relative(root, themeFile).replaceAll(path.sep, "/"));
    sourceAssemblies.push(path.relative(root, assemblyFile).replaceAll(path.sep, "/"));
    generatedUnitNames.push(...Object.values(unitIndex.all).flat());
  }

  if (sourceCreatedCount === 0) {
    processedRows.push([relPath, "待人工复核", inferSourceType(relPath), `分类为 ${profile.kind}，但未生成内容单元`]);
    processedSet.add(relPath);
    skippedByClassifier.push(relPath);
    logLines.push(`- 样本：${relPath}`);
    logLines.push(`  - 分类：${profile.kind}`);
    logLines.push("  - 结果：未生成内容单元，已转人工复核");
    continue;
  }

  processedRows.push([relPath, "已抽取草稿", inferSourceType(relPath), `草稿生成于 ${today}；模式：${profile.kind}；语义字段待AI复核`]);
  processedSet.add(relPath);
  processedNow.push(relPath);

  logLines.push(`- 样本：${relPath}`);
  logLines.push(`  - 分类：${profile.kind}`);
  logLines.push(`  - 原因：${profile.reason}`);
  logLines.push(`  - 生成草稿单元：${generatedUnitNames.join("、")}`);
  logLines.push(`  - 主题地图：${dedupeBy(sourceThemes, (item) => item).join("、")}`);
  logLines.push(`  - 装配稿：${dedupeBy(sourceAssemblies, (item) => item).join("、")}`);
  logLines.push(`  - 注意：所有语义字段均为脚本初筛，需 AI 复核后填充`);
}

saveProcessedRows(processedRows);
const ledgerStats = rebuildPendingLedger(processedSet);
appendLog(logLines);
upsertStatusOverview({
  today,
  scope: [
    "当前目录已进入内容结构化系统样本模式",
    processedNow.length > 0 ? `本轮处理文稿：${processedNow.join("、")}` : "本轮未新增处理文稿",
    skippedNow.length > 0 ? `本轮跳过已处理文稿：${skippedNow.join("、")}` : "本轮无已处理跳过项",
    skippedByClassifier.length > 0 ? `本轮被分类器跳过：${skippedByClassifier.join("、")}` : "本轮无分类器跳过项",
  ],
  done: [
    `本轮新增 ${createdUnits.length} 个内容单元草稿`,
    `已更新已处理清单，累计已处理 ${processedSet.size} 条`,
    `已回收待处理清单，当前剩余 ${ledgerStats.pendingCount} 条`,
    "所有草稿的语义字段均标记为「待AI提取」，需 AI 复核后填充",
  ],
  todo: [
    "AI 复核每个草稿单元：根据原文摘录填充 question_text / core_claim / concept_definition 等语义字段",
    "运行关系索引、去重候选与 Obsidian 补链脚本",
    "人工复核高价值单元的字段与边界",
  ],
  next: [
    "AI 逐个读取草稿单元，根据「原文摘录」填充语义字段并删除「待AI提取」标记",
    "运行 `node 07-脚本与工具/generate-link-map.js`",
    "运行 `node 07-脚本与工具/generate-duplicate-candidates.js`",
    "运行 `node 07-脚本与工具/fill-obsidian-links.js`",
  ],
});

console.log(
  JSON.stringify(
    {
      processedFiles: processedNow,
      skippedFiles: skippedNow,
      createdUnits,
      count: createdUnits.length,
      note: "所有单元为草稿，语义字段需AI复核",
    },
    null,
    2
  )
);
