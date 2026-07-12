#!/usr/bin/env bash
#
# backup-to-gitlab.sh
# 현재 작업물(이 저장소의 내용)을 기존 GitLab 저장소 안의 "하위 폴더"에 백업합니다.
#
# 사용법:
#   ./backup-to-gitlab.sh <GitLab_저장소_URL> [하위폴더이름]
#
# 예시:
#   ./backup-to-gitlab.sh https://gitlab.com/yaki27/my-backup.git
#   ./backup-to-gitlab.sh git@gitlab.com:yaki27/my-backup.git portfolio-deck
#
# - 하위폴더이름을 생략하면 "portfolio-deck" 폴더에 백업합니다.
# - GitLab 저장소가 비어 있어도(방금 만든 새 저장소여도) 동작합니다.
# - 인증은 git이 평소 쓰는 방식(HTTPS 토큰 / SSH 키)을 그대로 사용합니다.
#
set -euo pipefail

# ---- 입력값 확인 ------------------------------------------------------------
GITLAB_URL="${1:-}"
SUBFOLDER="${2:-portfolio-deck}"

if [ -z "$GITLAB_URL" ]; then
  echo "❌ GitLab 저장소 URL을 입력해주세요."
  echo "   사용법: ./backup-to-gitlab.sh <GitLab_저장소_URL> [하위폴더이름]"
  exit 1
fi

# 이 스크립트가 있는 폴더 = 백업할 원본 작업물
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 작업용 임시 폴더
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "📦 백업 원본 : $SOURCE_DIR"
echo "☁️  GitLab   : $GITLAB_URL"
echo "📁 하위폴더  : $SUBFOLDER"
echo ""

# ---- GitLab 저장소 클론 (없거나 비어 있으면 새로 초기화) --------------------
echo "→ GitLab 저장소를 가져오는 중..."
if git clone "$GITLAB_URL" "$WORK_DIR/repo" 2>/dev/null && [ -d "$WORK_DIR/repo/.git" ]; then
  cd "$WORK_DIR/repo"
  echo "  기존 저장소를 가져왔습니다."
else
  # 비어 있는 새 저장소 등으로 clone이 애매할 때: 새로 init 후 remote 연결
  echo "  비어 있는 저장소로 판단하여 새로 초기화합니다."
  mkdir -p "$WORK_DIR/repo"
  cd "$WORK_DIR/repo"
  git init -q
  git remote add origin "$GITLAB_URL"
  git fetch origin -q || true
  # 원격에 브랜치가 있으면 체크아웃
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    git checkout -q -b main origin/main
  elif git rev-parse --verify origin/master >/dev/null 2>&1; then
    git checkout -q -b master origin/master
  fi
fi

# ---- 하위 폴더에 현재 작업물 복사 (.git 제외) -------------------------------
echo "→ '$SUBFOLDER' 폴더에 작업물을 복사하는 중..."
DEST="$WORK_DIR/repo/$SUBFOLDER"
rm -rf "$DEST"
mkdir -p "$DEST"

# rsync가 있으면 rsync로, 없으면 tar로 복사 (둘 다 .git 제외)
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude='.git' --exclude='backup-to-gitlab.sh' "$SOURCE_DIR"/ "$DEST"/
else
  ( cd "$SOURCE_DIR" && tar --exclude='./.git' --exclude='./backup-to-gitlab.sh' -cf - . ) | ( cd "$DEST" && tar -xf - )
fi

# ---- 커밋 & 푸시 ------------------------------------------------------------
cd "$WORK_DIR/repo"

# 커밋 사용자 정보가 없을 때 대비 (백업용 기본값)
git config user.name  >/dev/null 2>&1 || git config user.name  "portfolio-backup"
git config user.email >/dev/null 2>&1 || git config user.email "backup@example.com"

git add -A
if git diff --cached --quiet; then
  echo "✅ 변경 사항이 없습니다. 이미 최신 상태입니다."
  exit 0
fi

STAMP="$(date '+%Y-%m-%d %H:%M:%S')"
git commit -q -m "백업: $SUBFOLDER ($STAMP)"

# 현재 브랜치 이름 (없으면 main)
BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"

echo "→ GitLab으로 푸시하는 중... (브랜치: $BRANCH)"
git push -u origin "$BRANCH"

echo ""
echo "🎉 백업 완료! GitLab의 '$SUBFOLDER' 폴더에 저장되었습니다."
