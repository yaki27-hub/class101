# GitLab 백업 안내

현재 작업물(`portfolio-deck`)을 기존에 쓰시던 **GitLab** 저장소 안의 **하위 폴더**에 백업하는 방법입니다.

## 준비물

1. GitLab에서 백업용 저장소를 하나 만듭니다. (예: `my-backup`)
   - 빈 저장소여도 되고, README가 있는 저장소여도 됩니다.
2. 그 저장소의 URL을 복사합니다.
   - HTTPS 예: `https://gitlab.com/사용자명/my-backup.git`
   - SSH 예: `git@gitlab.com:사용자명/my-backup.git`

## 백업 실행

이 폴더에서 아래 명령을 실행합니다.

```bash
./backup-to-gitlab.sh <GitLab_저장소_URL> [하위폴더이름]
```

예시:

```bash
# 기본: "portfolio-deck" 폴더에 백업
./backup-to-gitlab.sh https://gitlab.com/사용자명/my-backup.git

# 하위 폴더 이름을 직접 지정
./backup-to-gitlab.sh https://gitlab.com/사용자명/my-backup.git portfolio-2026
```

실행하면 GitLab 저장소 안에 지정한 하위 폴더가 생기고, 현재 작업물 전체가 그 안에 복사되어 커밋·푸시됩니다.

## 인증(로그인)은 어떻게 되나요?

스크립트는 git이 평소 쓰는 인증 방식을 그대로 사용합니다.

- **HTTPS URL**을 쓰면 GitLab 아이디/비밀번호(또는 Personal Access Token)를 물어봅니다.
  - GitLab은 비밀번호 대신 토큰을 권장합니다: GitLab → **Settings → Access Tokens**에서 `write_repository` 권한으로 발급.
- **SSH URL**을 쓰면 등록해 둔 SSH 키로 자동 인증됩니다.

## 다시 백업할 때

같은 명령을 다시 실행하면 됩니다. 변경된 내용만 새 커밋으로 쌓이고, 바뀐 게 없으면 "변경 사항이 없습니다"라고 알려줍니다.

## 참고

- 백업본에는 `.git` 폴더와 `backup-to-gitlab.sh` 스크립트 자체는 포함되지 않습니다(작업물만 깔끔하게 백업).
- 이 저장소의 원본은 GitHub(`yaki27-hub/portfolio-deck`)에 그대로 남아 있고, 위 방법은 GitLab에 별도 백업 사본을 만드는 것입니다.
