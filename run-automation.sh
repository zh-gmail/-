#!/bin/bash
# =============================================================================
# run-automation.sh - 三阶段 Agent 管道自动化运行器
# =============================================================================
# 每个任务依次经过 设计 → 实现 → 审查 三个阶段
# 使用: ./run-automation.sh [运行次数]
# 示例: ./run-automation.sh 5
#       不传参数 = 自动模式，所有任务完成后停止
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

LOG_DIR="./automation-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/automation-$(date +%Y%m%d_%H%M%S).log"

log() {
    local level=$1 message=$2 timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" >> "$LOG_FILE"
    case $level in
        INFO) echo -e "${BLUE}[INFO]${NC} ${message}" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} ${message}" ;;
        WARNING) echo -e "${YELLOW}[WARNING]${NC} ${message}" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} ${message}" ;;
        PROGRESS) echo -e "${CYAN}[PROGRESS]${NC} ${message}" ;;
    esac
}

# 参数：可选，不传则自动模式（所有任务完成后停止）
if [ $# -eq 0 ]; then
    log "INFO" "未指定轮数，启用自动模式（所有任务完成后自动停止）"
    RUNS=999
else
    RUNS=$1
fi

command -v claude &> /dev/null || { log "ERROR" "Claude Code 未安装"; exit 1; }
[ -f "task.json" ] || { log "ERROR" "task.json 不存在"; exit 1; }

log "INFO" "开始自动化: AI Hair Stylist Pro, 运行次数: $RUNS"

get_done_count() {
    python -c "
import json
with open('task.json', encoding='utf-8') as f:
    data = json.load(f)
print(sum(1 for t in data.get('tasks', []) if t.get('passes')))
" 2>/dev/null || echo "0"
}

get_total_count() {
    python -c "
import json
with open('task.json', encoding='utf-8') as f:
    data = json.load(f)
print(len(data.get('tasks', [])))
" 2>/dev/null || echo "0"
}

# 自上次深度审查以来完成的任务数
DONE_SINCE_REVIEW=0

# Main loop — 3-phase agent pipeline
for ((i=1; i<=RUNS; i++)); do
    log "INFO" "=== 第 $i 轮 ==="

    PREV_DONE=$(get_done_count)
    TOTAL=$(get_total_count)
    log "PROGRESS" "当前进度: $PREV_DONE/$TOTAL"

    # 检查是否所有 task 都完成了
    ALL_DONE=false
    python -c "
import json
with open('task.json', encoding='utf-8') as f:
    data = json.load(f)
exit(0 if all(t.get('passes') for t in data.get('tasks', [])) else 1)
" && ALL_DONE=true

    if [ "$ALL_DONE" = true ]; then
        log "PROGRESS" "所有预设任务已完成，执行深度审查扫描改进点..."

        # Deep Review Phase — 全项目扫描，发现问题加新 task
        claude -p --dangerously-skip-permissions <<< "你是一个项目质量审查员。对当前项目进行全维度深度审查，目标是发现可改进点。

审查维度：
1. 架构：模块职责、状态管理、props drilling、循环依赖
2. 性能：代码分割（大 chunk）、懒加载、useMemo 缺失、渲染优化
3. 安全：XSS、硬编码密钥、敏感信息泄露
4. 代码质量：死代码、空 catch、any、未用 import、叙事性注释
5. 依赖：未使用依赖、冗余依赖、npm audit 漏洞

输出格式：
对每个发现的改进点：
- 如果是可以立即修复的代码问题（如死代码、未使用 import、叙事性注释等）→ 直接修改文件修复
- 如果是需要开发的功能性改进（如添加测试、新功能、重构等）→ 追加到 task.json 的 tasks 数组中

新 task 格式：
{
  \"id\": <新ID>,
  \"title\": \"简短标题\",
  \"description\": \"详细描述\",
  \"steps\": [\"步骤1\", \"步骤2\"],
  \"dependsOn\": [],
  \"passes\": false
}

要求：
1. 先读 package.json 了解项目
2. 运行 npm run build 看是否有警告（大 chunk 等）
3. 扫描 src/ 目录下的代码
4. 直接修复死代码/注释等小问题
5. 新功能需求写入 task.json
6. 输出审查摘要
7. 如果任务需要外部资源（如 3D 模型文件、API 密钥、设计稿等）且你没有收到，在 task.json 中标记 blocked 并填写 blockedReason，不要自己生成替代品

git diff --name-only
git diff" 2>&1 | tee "$LOG_DIR/deep-review-$i.log"

        NEW_TOTAL=$(get_total_count)
        if [ "$NEW_TOTAL" -gt "$TOTAL" ]; then
            log "INFO" "深度审查发现新改进点，追加了 $((NEW_TOTAL - TOTAL)) 个新 task，继续执行"
            DONE_SINCE_REVIEW=0
            sleep 1
            continue
        else
            log "SUCCESS" "深度审查未发现新改进点，自动化完成"
            break
        fi
    fi

    # Phase 1: Design Agent
    log "INFO" "[阶段 1/3] 设计分析..."
    claude -p --dangerously-skip-permissions <<< "
分析 task.json 中下一个未完成的任务，输出设计方案。
要求：
1. 分析每个未完成任务的需求
2. 输出推荐的下一个任务及其实现方案
3. 方案包括：修改的文件、核心逻辑、测试方法
请保持简洁，只输出方案本身。
" > "$LOG_DIR/design-$i.log" 2>&1 || {
        log "WARNING" "设计阶段失败，继续下一轮"
        continue
    }
    log "SUCCESS" "设计阶段完成"

    # Phase 2: Implementation Agent
    log "INFO" "[阶段 2/3] 实现代码..."
    claude -p --dangerously-skip-permissions <<< "
按以下设计实现任务：
$(cat "$LOG_DIR/design-$i.log" 2>/dev/null | head -50)

要求：
1. 严格按设计方案实现
2. 运行 lint 和 build 验证
3. 更新 task.json 中对应任务的 passes 状态
4. 如果任务需要外部资源（如 3D 模型文件、API 密钥、设计稿等）且你没有收到这些资源 → 标记 blocked 并报告，不要自己生成替代品
" > "$LOG_DIR/implement-$i.log" 2>&1 || {
        log "WARNING" "实现阶段失败，继续下一轮"
        continue
    }
    log "SUCCESS" "实现阶段完成"

    # Phase 3: Review Agent — 代码级审查 + 自动修复
    log "INFO" "[阶段 3/3] 代码审查..."
    claude -p --dangerously-skip-permissions <<< "
任务：对上一轮实现进行代码审查并修复问题。

审查维度：
1. 代码质量：死代码、空 catch、as any、未使用 import、叙事性注释
2. 安全性：硬编码密钥、XSS 风险、敏感信息泄露
3. 架构：模块职责、状态管理、props drilling
4. 性能：代码分割、图片懒加载、useMemo 缺失

对每个发现的问题，按以下步骤处理：
1. 修复问题（外科手术式，一次只改一个）
2. 运行 npx tsc --noEmit 验证编译
3. 运行 npm run build 验证构建

输出审查报告，包含：
- 发现的问题数量及严重级别
- 已修复的问题列表
- 无法自动修复的问题（标注原因）

git diff --name-only
git diff
" > "$LOG_DIR/review-$i.log" 2>&1 || {
        log "WARNING" "审查阶段失败"
        continue
    }
    log "SUCCESS" "审查阶段完成（详见 review-$i.log）"

    # 统计本轮完成了多少 task
    NEW_DONE=$(get_done_count)
    TASKS_DONE=$((NEW_DONE - PREV_DONE))
    DONE_SINCE_REVIEW=$((DONE_SINCE_REVIEW + TASKS_DONE))
    log "PROGRESS" "当前进度: $NEW_DONE/$TOTAL"

    # 每完成 3 个 task 触发一次深度审查
    if [ $DONE_SINCE_REVIEW -ge 3 ]; then
        log "INFO" "已完成 $DONE_SINCE_REVIEW 个 task，触发深度项目审查..."

        claude -p --dangerously-skip-permissions <<< "你是一个项目质量审查员。对当前项目进行全维度深度审查，目标是发现可改进点。

审查维度：
1. 架构：模块职责、状态管理、props drilling、循环依赖
2. 性能：代码分割（大 chunk）、懒加载、useMemo 缺失、渲染优化
3. 安全：XSS、硬编码密钥、敏感信息泄露
4. 代码质量：死代码、空 catch、any、未用 import、叙事性注释
5. 依赖：未使用依赖、冗余依赖

输出格式：
- 可以立即修复的小问题 → 直接改
- 需要开发的功能性改进 → 追加到 task.json 的 tasks 数组（格式：{id, title, description, steps, dependsOn, passes: false}）
- 新 task 的 id 从当前最大 id+1 开始

先读 package.json，运行 npm run build，然后扫描 src/。直接修小问题，新功能写进 task.json。如果任务需要外部资源（模型、密钥、设计稿）且没收到，标记 blocked。" 2>&1 | tee "$LOG_DIR/deep-review-$i.log"

        NEW_TOTAL=$(get_total_count)
        if [ "$NEW_TOTAL" -gt "$TOTAL" ]; then
            log "INFO" "深度审查发现新改进点，追加了 $((NEW_TOTAL - TOTAL)) 个新 task"
        fi
        DONE_SINCE_REVIEW=0
    fi

    sleep 1
done

log "INFO" "=== 自动化完成 ==="
log "PROGRESS" "最终进度: $(get_done_count)/$(get_total_count)"
log "INFO" "日志: $LOG_DIR"
