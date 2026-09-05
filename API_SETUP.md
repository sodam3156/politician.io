# 데이터 연결 발급·등록 안내

확인일: 2026-09-06. 이미 제공받은 국회 키 외에 **YouTube API key와 NAVER API HUB 뉴스 Application의 Client ID/Secret**을 준비합니다. 제공처의 서비스 활성화·승인·이용 조건이 충족되어야 실제 요청이 성공합니다.
아래 이미지의 출처들은 모두 별개의 키를 요구하는 API가 아닙니다.

## 무엇을 발급하나요?

| 출처 | 준비할 값 | 공식 발급·확인 링크 | 이 시스템의 연결 |
| --- | --- | --- | --- |
| 국회 Open API | 인증키 1개 | [인증키 발급](https://open.assembly.go.kr/portal/openapi/openApiActKeyIssPage.do) · [이용 안내](https://open.assembly.go.kr/portal/openapi/openApiActKeyPage.do) | 인물 식별·발의자·개인 표결·표결 합계·의안 단계 |
| 대한민국 국회 공식 사이트 | 별도 키 없음 | [국회 공식 사이트](https://www.assembly.go.kr/) | 기관·인물 원문 확인, 구조화 정보는 국회 API 사용 |
| 의안정보시스템 | 별도 키 없음 | [의안정보시스템](https://likms.assembly.go.kr/bill/main.do) | 의안별 상세 원문 링크, 심사·처리·공포 필드 |
| 공공데이터포털 | 선택한 국회 자료는 LINK형 | [국회의원 본회의 표결정보](https://www.data.go.kr/data/15125948/openapi.do) | 같은 국회 제공처로 연결. 별도 포털 키를 중복 발급할 필요 없음 |
| YouTube Data API v3 | API key 1개 | [API 활성화](https://console.cloud.google.com/apis/library/youtube.googleapis.com) · [사용자 인증 정보](https://console.cloud.google.com/apis/credentials) | 공개 영상 검색, 제목·채널·게시일·원문 링크 |
| NAVER 뉴스 검색 | Client ID + Client Secret | [Naver Cloud 콘솔](https://console.ncloud.com/) · [Application 등록 안내](https://guide.ncloud-docs.com/docs/apihub-application) | NAVER API HUB 뉴스 검색. 독립된 원문 검색 표시 |

공공데이터포털의 모든 기관 API에 통하는 단일 데이터 계약은 없습니다. 다른 데이터가 필요하면 정확한 데이터셋과 활용 승인을 먼저 정해야 합니다.
이 프로젝트는 이미지의 **국회 관련 원자료**를 기준으로 연결합니다. 표결 미참여를 출석률로 바꾸거나, 소속 위원회를 활동 실적으로 계산하지 않습니다.

## 1. YouTube 발급

1. Google Cloud에서 프로젝트를 선택하거나 만듭니다.
2. YouTube Data API v3를 활성화합니다.
3. 사용자 인증 정보에서 API 키를 만듭니다. OAuth Client Secret과 혼동하지 마세요. 공개 영상 검색에는 API key를 사용합니다.
4. API 제한을 YouTube Data API v3로 지정합니다. 이 앱은 서버에서 호출하므로 브라우저 HTTP referrer 제한과 맞지 않습니다. IP 제한을 적용한다면 실제 실행 서버의 송신 IP가 허용되어야 합니다.

[Google 공식 시작 안내](https://developers.google.com/youtube/v3/getting-started)를 참고하세요.
API는 영상 자체·음성·자막 전문을 제공하는 다운로드 허가가 아닙니다. 현재는 공개 검색 메타데이터만 표시하며 OAuth가 필요한 개인 데이터·쓰기 기능은 사용하지 않습니다.
제공처의 쿼터는 [Google Cloud 콘솔](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas)에서 확인하세요. 앱 내부 한도는 하루 20검색이며 제공처의 전체 할당량을 뜻하지 않습니다.

## 2. NAVER 발급

1. 네이버 클라우드 콘솔에서 NAVER API HUB 이용을 신청하고 현재 약관·요금을 확인합니다.
2. Application 등록에서 NAVER 검색의 **뉴스**를 선택합니다.
3. 해당 Application의 Client ID와 Client Secret을 준비합니다. 일반 Ncloud 계정 Access Key/Secret Key와 다릅니다.
4. 새 키는 기본값인 HUB 경로로 연결합니다.

[공식 이관 공지](https://developers.naver.com/notice/article/32530)와 [뉴스 API 명세](https://api.ncloud-docs.com/docs/naver-api-hub-search-news)를 확인했습니다.
기존 개발자센터의 검색 API 승인을 갖고 있다면 실행 프로세스에 `NAVER_API_MODE=legacy`를 명시해야 합니다. HUB 키를 legacy로 자동 재시도하지 않습니다.

**이용 범위:** 검색결과는 제공 순서와 내용을 유지한 독립 영역에 표시합니다. AI 분석·요약·내보내기·장기 DB에는 넣지 않습니다. 광고·결제는 없습니다.
[2026-09-20 시행 예정 개정 공지](https://www.ncloud.com/support/notice/all/2243)에는 AI 활용·저장·검색 API를 통한 수익 활동 제한이 명시되어 있습니다.
따라서 발급키만으로 ‘뉴스 AI 분석 유료 서비스’까지 가능하다고 약속하지 않습니다. 그 기능은 허용 범위가 명시된 별도 공급 계약이 필요합니다.

## 3. 보안 등록 — 채팅에 키를 보내지 않아도 됩니다

프로젝트 폴더의 PowerShell에서 실행합니다.

```powershell
./scripts/connect-data.ps1
```

화면에는 네 값의 입력 요청이 순서대로 나옵니다. 입력은 가려지며 빈칸으로 넘기면 기존 값을 유지합니다.
특정 연결만 바꾸려면 `-Provider youtube`, `-Provider naver`, `-Provider assembly`를 붙입니다.

Windows의 현재 사용자 계정으로 암호화된 값만 `.local/api-vault/`에 저장합니다. 평문 키를 코드·문서·로그에 기록하지 않습니다.
보안 도우미를 실행한 PowerShell 환경을 함께 기록해 같은 환경으로 복호화합니다. 시스템 실행 정책을 변경하거나 우회하지 않습니다. 도우미 자체가 차단되면 허용된 PowerShell 환경에서 실행해야 합니다.
보관함의 실행 환경 기록이 없거나 잘못되면 다른 실행 파일을 추측하지 않고 중단합니다. 위 등록 도우미를 다시 실행하고 기존 값은 빈칸으로 넘기면 기록을 복구할 수 있습니다.
이 보관함은 Git 공개 대상이 아니며 다른 Windows 계정/PC로 복사해서 그대로 사용할 수 없습니다.
`read-vault.ps1`은 서버 전용 내부 도우미이므로 직접 실행하거나 출력을 복사하지 마세요.
Windows 이외에는 비밀 관리 도구로 `ASSEMBLY_API_KEY`, `YOUTUBE_API_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 프로세스 환경변수에 주입합니다.

## 4. 실행·확인

```sh
npm ci
npm start
```

이 명령은 사이트를 빌드하고 **로컬 전용** 서버를 시작합니다.
[연결 화면](http://127.0.0.1:8771/#/data)에서 상태를 확인하세요.
기존 8770 정적 미리보기는 API 연결 서버가 아닙니다. 실제 연결에는 8771 화면을 사용합니다.

1. ‘연결 상태 새로고침’: 값의 등록 여부를 확인합니다. 이것만으로 인증 성공으로 표시하지 않습니다.
2. ‘국회 실제 자료 갱신’: 최대 180초 동안 선택한 여섯 의안을 갱신합니다. 완료하면 화면의 원장을 다시 읽습니다.
3. 정치인 → ‘보도 속 핵심 맥락’ 아래 원문 검색에서 YouTube 또는 NAVER를 선택하고 검색합니다.
4. 실제 제공처의 유효 응답을 받은 연결만 ‘실제 요청 성공’으로 표시됩니다. 잘못된 키·서비스 비활성·한도 초과는 별도 오류로 표시합니다.

키를 변경하면 다음 요청부터 다시 읽습니다. 서버를 재시작할 필요가 없습니다.
키 없는 연결은 건너뛰며, 한 서비스 장애로 국회 원장이나 다른 제공처의 검색을 삭제하지 않습니다.

## 비용·보존·중단·복구

- 앱 상한(UTC 날짜 기준): 국회 동기화 4회/일, YouTube 검색 20회/일, NAVER 검색 50회/일. 제공처 가격·계정 전체 쿼터와 별개입니다.
- 제공처 요청은 12초·1MB 응답 상한, 자동 재시도 0회입니다. 페이지 추가 요청은 사용자가 직접 실행합니다.
- 국회 수집기는 별도로 64요청·180초·50페이지 상한을 지킵니다.
- 호출 횟수는 재시작 후에도 보존하고, 감사 기록은 최근 500건의 제공처·시각·성공/실패·행 수만 남깁니다. 검색어·제목·키는 기록하지 않습니다.
- 뉴스·영상 결과는 서버에 저장하지 않습니다. 브라우저 메모리에서만 표시하며 새 검색·화면 이동·새로고침·15분 경과 시 지웁니다. 앱이 검색·결과를 외부 AI로 보내지 않습니다.
- 실행 창에서 Ctrl+C로 연결 서버를 중단합니다. 브라우저 탭을 닫는 것만으로 서버가 중단되지는 않습니다.
- 국회 실패 시 이전 스냅샷을 유지합니다. 복원이 필요하면 `.local/assembly.previous.json`을 `public/data/assembly.json`으로 복사하고 자료를 다시 읽습니다.
- 코드는 [GitHub](https://github.com/sodam3156/politician.io)에 공개되지만 보관함·호출 기록·수집 스냅샷은 공개하지 않습니다.

## 검증 수준

키가 없는 제공처는 실제 인증 검증이 끝난 상태가 아닙니다. 모의 응답 계약 테스트와 실제 키 요청을 구분합니다.
원문 데이터의 최신성·뉴스 이용 계약·YouTube 쿼터·계정별 승인은 각 제공처에서 최종 결정합니다.
인터넷 공개 서버 배포, 여러 사용자 계정, 외부 알림, 상용 뉴스 AI 공급은 이번 로컬 연결 도우미에 포함하지 않습니다.
