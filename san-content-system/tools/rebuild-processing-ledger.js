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
const sourceRoot = path.join(root, "01-原始素材区");
const stateRoot = path.join(root, "03-处理状态");

const rawIndexPath = path.join(stateRoot, "原始素材索引.csv");
const pendingPath = path.join(stateRoot, "待处理清单.csv");
const processedPath = path.join(stateRoot, "已处理清单.csv");

const catalog = [
  { category: "短视频", sourceType: "短视频", dirs: ["短视频/文稿"] },
  { category: "公众号", sourceType: "公众号文章", dirs: ["公众号"] },
  { category: "观点与概念", sourceType: "观点与概念", dirs: ["观点与概念"] },
  { category: "爆款文稿", sourceType: "爆款文稿", dirs: ["爆款文稿"] },
  { category: "推文", sourceType: "推文素材", dirs: ["推文"] },
  { category: "其他作者", sourceType: "外部研究素材", dirs: ["其他作者"] },
  { category: "san", sourceType: "本人内容", dirs: ["san"] },
  { category: "完整副本", sourceType: "完整副本", dirs: ["完整副本"] },
];

function walkFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(full));
    else if (entry.isFile() && /\.(md|txt|html|csv|json|jsonl)$/i.test(entry.name)) results.push(full);
  }
  return results;
}

function csvEscape(value) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function readProcessedPaths(rawRelPaths) {
  const processed = new Set();
  if (fs.existsSync(processedPath)) {
    const lines = fs.readFileSync(processedPath, "utf8").split("\n").slice(1);
    for (const line of lines) {
      if (!line.trim()) continue;
      const match = line.match(/^"((?:[^"]|"")*)"/);
      if (!match) continue;
      processed.add(match[1].replaceAll("\"\"", "\""));
    }
  }
  // 自动核对：扫描内容单元库，被单元 source_documents 引用过的源文件自动标记为已处理
  const unitRoot = path.join(root, "02-内容单元库");
  if (fs.existsSync(unitRoot)) {
    const unitFiles = walkFiles(unitRoot);
    const referencedIds = new Set();
    for (const uf of unitFiles) {
      const content = fs.readFileSync(uf, "utf8");
      const matches = content.matchAll(/^\s*-\s*(SRC-\S+)/gm);
      for (const m of matches) {
        referencedIds.add(m[1]);
      }
    }
    // 将源文件路径与 SRC-ID 匹配（文件名去掉扩展名和路径前缀即为 SRC-ID）
    for (const rel of rawRelPaths) {
      const basename = path.basename(rel, path.extname(rel));
      if (referencedIds.has("SRC-" + basename)) {
        processed.add(rel);
      }
    }
  }
  return processed;
}

const rawRows = [["path", "category"]];
const pendingRows = [["path", "status", "source_type", "notes"]];
const allRawRelPaths = [];

for (const rule of catalog) {
  const files = rule.dirs
    .flatMap((rel) => walkFiles(path.join(sourceRoot, rel)))
    .map((file) => path.relative(sourceRoot, file).replaceAll(path.sep, "/"))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  for (const rel of files) {
    rawRows.push([rel, rule.category]);
    allRawRelPaths.push(rel);
  }
}

const processed = readProcessedPaths(allRawRelPaths);
for (const row of rawRows.slice(1)) {
  const rel = row[0];
  const rule = catalog.find((c) => c.category === row[1]);
  if (!processed.has(rel)) pendingRows.push([rel, "待处理", rule.sourceType, ""]);
}

fs.writeFileSync(rawIndexPath, rawRows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");
fs.writeFileSync(pendingPath, pendingRows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");

// 写已处理清单
const processedRows = [["path", "status", "source_type", "notes"]];
for (const row of rawRows.slice(1)) {
  const rel = row[0];
  if (processed.has(rel)) {
    const rule = catalog.find((c) => c.category === row[1]);
    processedRows.push([rel, "已处理", rule.sourceType, ""]);
  }
}
fs.writeFileSync(processedPath, processedRows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");

console.log(JSON.stringify({
  rawIndexPath,
  pendingPath,
  processedPath,
  rawCount: rawRows.length - 1,
  pendingCount: pendingRows.length - 1,
  processedCount: processedRows.length - 1,
}, null, 2));
