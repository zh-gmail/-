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

get_progress() {
    python -c "
import json
with open('task.json', encoding='utf-8') as f:
    data = json.load(f)
tasks = data.get('tasks', [])
total = len(tasks)
done = sum(1 for t in tasks if t.get('passes'))
print(f'{done}/{total}')
" 2>/dev/null || echo "?/?"
}

# Main loop — 3-phase agent pipeline
for ((i=1; i<=RUNS; i++)); do
    log "INFO" "=== 第 $i 轮 ==="

    PROGRESS=$(get_progress)
    log "PROGRESS" "当前进度: $PROGRESS"

    # Check completion
    python -c "
import json
with open('task.json', encoding='utf-8') as f:
    data = json.load(f)
all_done = all(t.get('passes') for t in data.get('tasks', []))
exit(0 if all_done else 1)
" && { log "SUCCESS" "所有任务已完成"; break; }

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
" > "$LOG_DIR/implement-$i.log" 2>&1 || {
        log "WARNING" "实现阶段失败，继续下一轮"
        continue
    }
    log "SUCCESS" "实现阶段完成"

    # Phase 3: Review Agent — 全维度审查 + 自动修复
    log "INFO" "[阶段 3/3] 全维度审查..."
    claude -p --dangerously-skip-permissions <<< "
任务：对上一轮实现进行全维度审查并修复问题。

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

    # Check progress
    NEW_PROGRESS=$(get_progress)
    log "PROGRESS" "当前进度: $NEW_PROGRESS"
    sleep 1
done

log "INFO" "=== 自动化完成 ==="
log "PROGRESS" "最终进度: $(get_progress)"
log "INFO" "日志: $LOG_DIR"
