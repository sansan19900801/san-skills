#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  install-skill.sh [--dry-run] link <skill-name-or-path>
  install-skill.sh [--dry-run] unlink <skill-name-or-path>
  install-skill.sh status <skill-name-or-path>
  install-skill.sh list

Options:
  --dry-run, -n   只打印将要创建/删除的软链和适配层，不真正改动文件系统

Examples:
  install-skill.sh link my-skill
  install-skill.sh link skills/my-skill
  install-skill.sh link skills
  install-skill.sh --dry-run link my-skill
  install-skill.sh status /absolute/path/to/skill
  install-skill.sh list

Routing:
  ~/.agents/skills is the shared skill bus. Codex, GitHub Copilot, Gemini CLI,
  Cursor, Augment, Roo Code, OpenCode, and OpenHands read skills from there.

  Claude Code, WorkBuddy, Hermes Agent, Kiro, Qwen Code, and Cline receive
  native symlinks only when their home directories already exist.

  Grok receives a thin bridge instead of a symlink. Legacy and duplicate
  symlinks created under shared-compatible or retired host directories are
  removed automatically when they point to the selected source.
USAGE
}

die() {
  echo "✗ $*" >&2
  exit 1
}

# 预演模式：为 0 时真正落地，为 1 时只打印将要执行的改动。
DRY_RUN=0
dry_on() { [[ "$DRY_RUN" -eq 1 ]]; }
op_mkdir() {
  if dry_on; then echo "· [预演] 将创建目录 $*"; else mkdir -p "$@"; fi
}
op_rm() {
  if dry_on; then echo "· [预演] 将删除 $*"; else rm "$@"; fi
}
op_rmrf() {
  if dry_on; then echo "· [预演] 将递归删除 $*"; else rm -rf "$@"; fi
}
op_ln() {
  # op_ln <src> <link>
  if dry_on; then echo "✓ [预演] 将软链 $2 -> $1"; else ln -sfn "$1" "$2"; fi
}

repo_root() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$script_dir/../../.." && pwd
}

resolve_candidate() {
  local input="$1"
  local root="$2"
  local candidate

  if [[ "$input" = /* ]]; then
    candidate="$input"
  elif [[ -d "$PWD/$input" ]]; then
    candidate="$PWD/$input"
  elif [[ -d "$root/$input" ]]; then
    candidate="$root/$input"
  elif [[ -d "$root/skills/$input" ]]; then
    candidate="$root/skills/$input"
  else
    die "找不到 Skill 或 Skill 集合目录：$input"
  fi

  candidate="$(cd "$candidate" && pwd -P)"
  printf '%s\n' "$candidate"
}

list_skill_sources() {
  local candidate="$1"
  local found=0

  if [[ -f "$candidate/SKILL.md" ]]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  while IFS= read -r skill_file; do
    found=1
    dirname "$skill_file"
  done < <(find "$candidate" -mindepth 2 -maxdepth 2 -name SKILL.md -type f | sort)

  [[ "$found" -eq 1 ]] || die "$candidate 里没有 SKILL.md，也没有包含 SKILL.md 的一级子目录"
}

skill_name() {
  local src="$1"
  local skill_file="$src/SKILL.md"
  local name

  name="$(awk '
    NR == 1 && $0 == "---" { in_frontmatter = 1; next }
    in_frontmatter && $0 == "---" { exit }
    in_frontmatter && /^name:[[:space:]]*/ {
      sub(/^name:[[:space:]]*/, "")
      gsub(/^[[:space:]]+|[[:space:]]+$/, "")
      print
      exit
    }
  ' "$skill_file")"

  if [[ "$name" == \"*\" && "$name" == *\" ]] || [[ "$name" == \'*\' && "$name" == *\' ]]; then
    name="${name:1:${#name}-2}"
  fi
  [[ -n "$name" ]] || name="$(basename "$src")"

  case "$name" in
    .|..|*/*) die "Skill name 不合法：$name（$skill_file）" ;;
  esac
  printf '%s\n' "$name"
}

SHARED_TARGET_DIR="$HOME/.agents/skills"

# 这些客户端没有采用 ~/.agents/skills，或当前仍需要原生目录。
NATIVE_TARGET_DIRS=(
  "$HOME/.claude/skills"
  "$HOME/.workbuddy/skills"
  "$HOME/.hermes/skills"
  "$HOME/.kiro/skills"
  "$HOME/.qwen/skills"
  "$HOME/.cline/skills"
)

# 前 8 项已能读取 ~/.agents/skills；其余是旧版脚本曾写入、现已停止维护的目录。
# link 会清理其中指向当前源 Skill 的软链，避免同一 Skill 多入口和随机扩散。
REDUNDANT_TARGET_DIRS=(
  "$HOME/.codex/skills"
  "$HOME/.copilot/skills"
  "$HOME/.gemini/skills"
  "$HOME/.cursor/skills"
  "$HOME/.augment/skills"
  "$HOME/.roo/skills"
  "$HOME/.config/opencode/skills"
  "$HOME/.openhands/skills"
  "$HOME/.kilocode/skills"
  "$HOME/.trae/skills"
  "$HOME/.trae-cn/skills"
  "$HOME/.codebuddy/skills"
  "$HOME/.zencoder/skills"
  "$HOME/.continue/skills"
  "$HOME/.aider-desk/skills"
  "$HOME/.factory/skills"
  "$HOME/.forge/skills"
  "$HOME/.vibe/skills"
  "$HOME/.codestudio/skills"
  "$HOME/.codemaker/skills"
  "$HOME/.codeartsdoer/skills"
  "$HOME/.junie/skills"
  "$HOME/.qoder/skills"
  "$HOME/.openclaw/skills"
)

host_root_for() {
  dirname "$1"
}

resolved_link_target() {
  local link="$1"
  local target
  local parent

  target="$(readlink "$link")" || return 1
  if [[ "$target" = /* ]]; then
    [[ -d "$target" ]] || return 1
    (cd "$target" && pwd -P)
    return
  fi

  parent="$(dirname "$link")"
  [[ -d "$parent/$target" ]] || return 1
  (cd "$parent/$target" && pwd -P)
}

link_points_to() {
  local link="$1"
  local src="$2"
  local raw_target
  local resolved_target

  [[ -L "$link" ]] || return 1
  raw_target="$(readlink "$link")"
  [[ "$raw_target" == "$src" ]] && return 0

  resolved_target="$(resolved_link_target "$link" 2>/dev/null || true)"
  [[ -n "$resolved_target" && "$resolved_target" == "$src" ]]
}

link_targets_under() {
  local link="$1"
  local candidate="$2"
  local raw_target
  local resolved_target

  [[ -L "$link" ]] || return 1
  raw_target="$(readlink "$link")"
  case "$raw_target" in
    "$candidate"|"$candidate"/*) return 0 ;;
  esac

  resolved_target="$(resolved_link_target "$link" 2>/dev/null || true)"
  case "$resolved_target" in
    "$candidate"|"$candidate"/*) return 0 ;;
  esac
  return 1
}

link_one() {
  local src="$1"
  local dest_dir="$2"
  local name="$3"
  local create_parent="$4"
  local link="$dest_dir/$name"
  local host_root

  host_root="$(host_root_for "$dest_dir")"
  if [[ "$create_parent" -eq 0 && ! -d "$host_root" ]]; then
    echo "· $host_root 不存在，跳过"
    return 0
  fi

  op_mkdir "$dest_dir"

  if [[ -e "$link" && ! -L "$link" ]]; then
    echo "✗ $link 是真实目录或文件，已保留"
    return 2
  fi

  op_ln "$src" "$link"
  if dry_on; then return 0; fi
  echo "✓ $link -> $(readlink "$link")"
}

unlink_if_points_to() {
  local src="$1"
  local dest_dir="$2"
  local name="$3"
  local link="$dest_dir/$name"

  if [[ -L "$link" ]]; then
    if link_points_to "$link" "$src"; then
      op_rm "$link"
      dry_on || echo "✓ 已移除软链 $link"
    else
      echo "✗ $link 指向其他源，已保留"
      return 2
    fi
  elif [[ -e "$link" ]]; then
    echo "✗ $link 是真实目录或文件，已保留"
    return 2
  else
    echo "· $link 不存在，跳过"
  fi
}

remove_redundant_one() {
  local src="$1"
  local dest_dir="$2"
  local name="$3"
  local link="$dest_dir/$name"

  [[ -e "$dest_dir" || -L "$dest_dir" ]] || return 0

  if [[ -L "$link" ]]; then
    if link_points_to "$link" "$src"; then
      op_rm "$link"
      dry_on || echo "✓ 已清理冗余软链 $link"
    else
      echo "✗ $link 指向其他源，已保留"
      return 2
    fi
  elif [[ -e "$link" ]]; then
    echo "✗ $link 是真实目录或文件，已保留"
    return 2
  fi
}

remove_redundant_collection_links() {
  local candidate="$1"
  local dest_dir
  local link

  for dest_dir in "${REDUNDANT_TARGET_DIRS[@]}"; do
    [[ -d "$dest_dir" ]] || continue
    while IFS= read -r link; do
      if link_targets_under "$link" "$candidate"; then
        op_rm "$link"
        echo "✓ 已清理冗余软链 $link"
      fi
    done < <(find "$dest_dir" -mindepth 1 -maxdepth 1 -type l | sort)
  done
}

remove_duplicate_aliases() {
  local candidate="$1"
  local dest_dir
  local link
  local target
  local canonical
  local canonical_name

  for dest_dir in "$SHARED_TARGET_DIR" "${NATIVE_TARGET_DIRS[@]}"; do
    [[ -d "$dest_dir" ]] || continue
    while IFS= read -r link; do
      link_targets_under "$link" "$candidate" || continue
      target="$(resolved_link_target "$link" 2>/dev/null || true)"
      [[ -n "$target" ]] || continue
      [[ -f "$target/SKILL.md" ]] || continue
      canonical_name="$(skill_name "$target")"
      canonical="$dest_dir/$canonical_name"
      if [[ "$link" != "$canonical" ]] && link_points_to "$canonical" "$target"; then
        op_rm "$link"
        dry_on || echo "✓ 已清理重复别名 $link"
      fi
    done < <(find "$dest_dir" -mindepth 1 -maxdepth 1 -type l | sort)
  done
}

remove_stale_collection_artifacts() {
  local candidate="$1"
  local dest_dir
  local link
  local raw_target
  local grok_skill
  local source_file
  local grok_dir

  for dest_dir in "$SHARED_TARGET_DIR" "${NATIVE_TARGET_DIRS[@]}"; do
    [[ -d "$dest_dir" ]] || continue
    while IFS= read -r link; do
      raw_target="$(readlink "$link")"
      case "$raw_target" in
        "$candidate"|"$candidate"/*)
          if [[ ! -f "$raw_target/SKILL.md" ]]; then
            op_rm "$link"
            dry_on || echo "✓ 已清理失效软链 $link"
          fi
          ;;
      esac
    done < <(find "$dest_dir" -mindepth 1 -maxdepth 1 -type l | sort)
  done

  [[ -d "$HOME/.grok/skills" ]] || return 0
  while IFS= read -r grok_skill; do
    grep -q '^## Grok Bridge$' "$grok_skill" || continue
    source_file="$(grep -m 1 '^- Source of truth:' "$grok_skill" | sed 's/^- Source of truth: //')"
    case "$source_file" in
      "$candidate"/SKILL.md|"$candidate"/*/SKILL.md)
        if [[ ! -f "$source_file" ]]; then
          grok_dir="$(dirname "$grok_skill")"
          op_rmrf "$grok_dir"
          dry_on || echo "✓ 已清理失效 Grok bridge $grok_dir"
        fi
        ;;
    esac
  done < <(find "$HOME/.grok/skills" -mindepth 2 -maxdepth 2 -name SKILL.md -type f | sort)
}

status_one() {
  local src="$1"
  local dest_dir="$2"
  local name="$3"
  local label="$4"
  local link="$dest_dir/$name"

  if [[ -L "$link" ]]; then
    if link_points_to "$link" "$src"; then
      echo "✓ ${label}：$link -> $(readlink "$link")"
    else
      echo "✗ ${label}：$link 指向其他源 $(readlink "$link")"
      return 2
    fi
  elif [[ -e "$link" ]]; then
    echo "✗ ${label}：$link 存在，但不是软链"
    return 2
  else
    echo "· ${label}：$link 未桥接"
  fi
}

status_redundant_one() {
  local src="$1"
  local dest_dir="$2"
  local name="$3"
  local link="$dest_dir/$name"

  if [[ -L "$link" ]] && link_points_to "$link" "$src"; then
    echo "✗ 发现冗余入口：$link -> $(readlink "$link")"
    return 2
  elif [[ -L "$link" ]]; then
    echo "✗ 公共兼容客户端存在同名其他来源：$link -> $(readlink "$link")"
    return 2
  elif [[ -e "$link" ]]; then
    echo "✗ 公共兼容客户端存在同名真实目录或文件：$link"
    return 2
  fi
  return 0
}

link_grok_one() {
  local src="$1"
  local name="$2"
  local grok_home="$HOME/.grok"
  local dir="$grok_home/skills/$name"
  local skill_file="$dir/SKILL.md"

  if [[ ! -d "$grok_home" ]]; then
    echo "· $grok_home 不存在，跳过"
    return 0
  fi

  if [[ -L "$dir" ]]; then
    op_rm "$dir"
  elif [[ -e "$dir" && ! -d "$dir" ]]; then
    echo "✗ $dir 是真实文件，已保留"
    return 2
  elif [[ -d "$dir" && -f "$skill_file" ]] && ! grep -q '^## Grok Bridge$' "$skill_file"; then
    echo "✗ $dir 是真实 Grok Skill，已保留"
    return 2
  elif [[ -d "$dir" && ! -f "$skill_file" ]]; then
    echo "✗ $dir 是真实目录，已保留"
    return 2
  fi

  if dry_on; then
    echo "· [预演] 将写入 Grok 适配层 $skill_file -> $src/SKILL.md"
    return 0
  fi
  op_mkdir "$dir"
  grok_bridge_content "$src" "$name" > "$skill_file"
  echo "✓ $dir -> $src"
}

grok_bridge_content() {
  local src="$1"
  local name="$2"
  cat <<EOF
---
name: $name
user_invocable: true
description: |
  $name bridge。在 Grok TUI 中可通过 /$name 触发；触发后必须先读取项目真源 SKILL.md。
---
# $name

## Grok Bridge

- Source of truth: $src/SKILL.md
- Read the source-of-truth file before executing this skill.
- Follow the source file's workflow, constraints, examples, and output format.
- Treat this file as a thin Grok bridge only; do not maintain long-form logic here.

## 使用说明

1. 在 Grok TUI 中输入 \`/$name\` 即可触发。
2. Grok 会优先使用本 bridge 指向的真源。
3. 如需更新，直接修改真源。
EOF
}

unlink_grok_one() {
  local name="$1"
  local grok_home="$HOME/.grok"
  local dir="$grok_home/skills/$name"
  local skill_file="$dir/SKILL.md"

  if [[ ! -d "$grok_home" ]]; then
    echo "· $grok_home 不存在，跳过"
    return 0
  fi

  if [[ -L "$dir" ]]; then
    op_rm "$dir"
    dry_on || echo "✓ 已移除软链 $dir"
  elif [[ -d "$dir" && -f "$skill_file" ]] && grep -q '^## Grok Bridge$' "$skill_file"; then
    op_rmrf "$dir"
    dry_on || echo "✓ 已移除 Grok bridge $dir"
  elif [[ -e "$dir" ]]; then
    echo "✗ $dir 是真实目录或文件，已保留"
    return 2
  else
    echo "· $dir 不存在，跳过"
  fi
}

status_grok_one() {
  local name="$1"
  local grok_home="$HOME/.grok"
  local dir="$grok_home/skills/$name"
  local skill_file="$dir/SKILL.md"
  local source

  if [[ ! -d "$grok_home" ]]; then
    echo "· Grok：$grok_home 不存在"
    return 0
  fi

  if [[ -d "$dir" && -f "$skill_file" ]] && grep -q '^## Grok Bridge$' "$skill_file"; then
    source="$(grep -m 1 '^- Source of truth:' "$skill_file" | sed 's/^- Source of truth: //')"
    if grep -q '^user_invocable: true$' "$skill_file"; then
      echo "✓ Grok：$dir -> $source"
    else
      echo "✗ Grok：$dir 缺少 user_invocable: true"
      return 2
    fi
  elif [[ -e "$dir" ]]; then
    echo "✗ Grok：$dir 存在，但并非本工具生成的适配层"
    return 2
  else
    echo "· Grok：$dir 未桥接"
  fi
}

list_entry() {
  local dir="$1" name="$2" label="$3" link="$1/$2"
  if [[ -L "$link" ]]; then
    echo "  ✓ $label -> $(readlink "$link")"
  elif [[ -e "$link" ]]; then
    echo "  ! $label 存在真实条目（非软链）：$link"
  fi
}

list_installed() {
  local tmp_names d name host gf s
  tmp_names="$(mktemp)"
  {
    for d in "$SHARED_TARGET_DIR" "${NATIVE_TARGET_DIRS[@]}"; do
      if [[ -d "$d" ]]; then
        find "$d" -mindepth 1 -maxdepth 1 \( -type l -o -type d \) -exec basename {} \;
      fi
    done
    if [[ -d "$HOME/.grok/skills" ]]; then
      find "$HOME/.grok/skills" -mindepth 1 -maxdepth 1 -type d -exec basename {} \;
    fi
  } | sort -u > "$tmp_names"

  if [[ ! -s "$tmp_names" ]]; then
    echo "未发现已安装的 Skill（已扫描公共入口、各专属目录与 Grok）"
    rm -f "$tmp_names"
    return 0
  fi

  while IFS= read -r name; do
    echo "== $name =="
    list_entry "$SHARED_TARGET_DIR" "$name" "公共入口"
    for d in "${NATIVE_TARGET_DIRS[@]}"; do
      host="$(basename "$(dirname "$d")" | sed 's/^\.//')"
      list_entry "$d" "$name" "$host"
    done
    gf="$HOME/.grok/skills/$name/SKILL.md"
    if [[ -f "$gf" ]]; then
      s="$(grep -m 1 '^- Source of truth:' "$gf" | sed 's/^- Source of truth: //')"
      echo "  ✓ grok 适配层 -> $s"
    fi
  done < "$tmp_names"
  rm -f "$tmp_names"
}

main() {
  local args=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run|-n) DRY_RUN=1; shift ;;
      -h|--help) usage; exit 0 ;;
      --) shift; args+=("$@"); break ;;
      *) args+=("$1"); shift ;;
    esac
  done
  set -- "${args[@]}"

  if [[ "${1:-}" == "list" ]]; then
    [[ $# -eq 1 ]] || { usage; exit 1; }
    list_installed
    exit $?
  fi

  if [[ $# -ne 2 ]]; then
    usage
    exit 1
  fi

  local action="$1"
  local input="$2"
  local root
  local candidate
  local src
  local name
  local target_dir
  local failed=0

  case "$action" in
    link|unlink|status) ;;
    *) usage; exit 1 ;;
  esac

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "· 预演模式：不会真正创建或删除任何文件"
  fi

  root="$(repo_root)"
  candidate="$(resolve_candidate "$input" "$root")"

  while IFS= read -r src; do
    name="$(skill_name "$src")"
    echo "== $name =="

    case "$action" in
      link)
        link_one "$src" "$SHARED_TARGET_DIR" "$name" 1 || failed=1
        for target_dir in "${NATIVE_TARGET_DIRS[@]}"; do
          link_one "$src" "$target_dir" "$name" 0 || failed=1
        done
        for target_dir in "${REDUNDANT_TARGET_DIRS[@]}"; do
          remove_redundant_one "$src" "$target_dir" "$name" || failed=1
        done
        link_grok_one "$src" "$name" || failed=1
        ;;
      unlink)
        unlink_if_points_to "$src" "$SHARED_TARGET_DIR" "$name" || failed=1
        for target_dir in "${NATIVE_TARGET_DIRS[@]}" "${REDUNDANT_TARGET_DIRS[@]}"; do
          unlink_if_points_to "$src" "$target_dir" "$name" || failed=1
        done
        unlink_grok_one "$name" || failed=1
        ;;
      status)
        status_one "$src" "$SHARED_TARGET_DIR" "$name" "公共入口" || failed=1
        for target_dir in "${NATIVE_TARGET_DIRS[@]}"; do
          if [[ -d "$(host_root_for "$target_dir")" ]]; then
            status_one "$src" "$target_dir" "$name" "专属入口" || failed=1
          fi
        done
        for target_dir in "${REDUNDANT_TARGET_DIRS[@]}"; do
          status_redundant_one "$src" "$target_dir" "$name" || failed=1
        done
        status_grok_one "$name" || failed=1
        ;;
    esac
  done < <(list_skill_sources "$candidate")

  if [[ "$action" == "link" ]]; then
    remove_redundant_collection_links "$candidate"
    remove_duplicate_aliases "$candidate"
    remove_stale_collection_artifacts "$candidate"
  fi

  if [[ "$action" == "status" && "$failed" -eq 0 ]]; then
    echo "✓ 未发现冗余入口"
  fi

  exit "$failed"
}

main "$@"
