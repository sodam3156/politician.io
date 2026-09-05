export type ProviderId = "assembly" | "youtube" | "naver";
export type ConnectionState = "missing" | "configured" | "verified" | "error";
export type ProviderStatus = {
  id: ProviderId;
  state: ConnectionState;
  checkedAt?: string;
  message?: string;
  used: number;
  limit: number;
};
export type IntegrationStatus = {
  providers: ProviderStatus[];
  vault: "windows-encrypted" | "environment-only";
  assemblyJob?: {
    state: "running" | "success" | "error";
    startedAt: string;
    message?: string;
  };
};
export type MediaResult = {
  provider: "youtube" | "naver";
  fetchedAt: string;
  query: string;
  total?: number;
  nextPage?: string;
  videos?: {
    id: string;
    title: string;
    channel: string;
    channelId: string;
    publishedAt: string;
    url: string;
    thumbnail?: string;
  }[];
  // Preserve NAVER order, URLs, title and description. No AI pipeline/import/export.
  news?: {
    title: string;
    description: string;
    link: string;
    originallink: string;
    pubDate: string;
  }[];
};
export const integrationCatalog = [
  {
    id: "assembly",
    label: "국회 Open API",
    type: "API",
    provider: "assembly",
    issueUrl:
      "https://open.assembly.go.kr/portal/openapi/openApiActKeyIssPage.do",
    guideUrl: "https://open.assembly.go.kr/portal/openapi/openApiActKeyPage.do",
    fields: "인증키 1개",
    role: "인물 식별·발의·표결·의안 처리 단계",
    note: "현재 선택한 6개 의안을 수집합니다. 표결 미참여로 출석률을 추정하지 않습니다.",
  },
  {
    id: "assembly-site",
    label: "대한민국 국회 공식 사이트",
    type: "원문",
    provider: "assembly",
    issueUrl: "https://www.assembly.go.kr/",
    guideUrl: "https://www.assembly.go.kr/",
    fields: "별도 키 불필요",
    role: "공식 인물 정보와 기관 원문 확인",
    note: "웹사이트입니다. 구조화 자료는 국회 Open API로 연결합니다.",
  },
  {
    id: "bills-site",
    label: "의안정보시스템",
    type: "원문",
    provider: "assembly",
    issueUrl: "https://likms.assembly.go.kr/bill/main.do",
    guideUrl: "https://likms.assembly.go.kr/bill/main.do",
    fields: "별도 키 불필요",
    role: "심사·가결/부결·위원회 회부의 원문",
    note: "각 법안의 공식 상세 링크로 연결합니다. 사이트 접근을 API 인증 성공으로 세지 않습니다.",
  },
  {
    id: "data-go",
    label: "공공데이터포털",
    type: "목록",
    provider: "assembly",
    issueUrl: "https://www.data.go.kr/data/15125948/openapi.do",
    guideUrl: "https://www.data.go.kr/",
    fields: "이 국회 자료는 LINK형",
    role: "국회 표결 데이터 등록 정보·이용 조건 확인",
    note: "선택한 데이터는 국회 제공처로 연결됩니다. 별도의 data.go.kr 키를 중복 요청하지 않습니다. 다른 기관 데이터는 해당 API를 지정해야 합니다.",
  },
  {
    id: "youtube",
    label: "YouTube Data API v3",
    type: "API",
    provider: "youtube",
    issueUrl: "https://console.cloud.google.com/apis/credentials",
    guideUrl: "https://developers.google.com/youtube/v3/getting-started",
    fields: "API key 1개",
    role: "관련 공개 영상의 제목·채널·게시일·원문",
    note: "프로젝트에서 YouTube Data API v3를 활성화하세요. 영상·음성·자막 다운로드나 발언 전문 분석은 하지 않습니다.",
  },
  {
    id: "naver",
    label: "NAVER 뉴스 검색",
    type: "API",
    provider: "naver",
    issueUrl: "https://console.ncloud.com/",
    guideUrl: "https://guide.ncloud-docs.com/docs/apihub-application",
    fields: "Client ID + Client Secret",
    role: "독립된 네이버 검색결과와 기사 원문",
    note: "신규는 NAVER API HUB의 뉴스 Application을 등록하세요. 검색결과를 AI 분석·저장·내보내기에 넣지 않습니다. 기존 개발자센터 키는 별도 legacy 선택이 필요합니다.",
  },
] as const;

export const integrationMessage: Record<string, string> = {
  KEY_REQUIRED:
    "키가 아직 등록되지 않았습니다. 발급 후 보안 등록 도우미를 실행해주세요.",
  KEY_FORMAT:
    "등록값의 형식을 확인해주세요. 키 내용은 화면에 반환하지 않습니다.",
  AUTH_FAILED:
    "인증 또는 서비스 사용 권한을 확인해주세요. API 활성화·키 제한·Application 선택을 확인하세요.",
  RATE_LIMIT:
    "제공처의 호출 한도에 도달했습니다. 콘솔의 할당량을 확인해주세요.",
  DAILY_LIMIT: "이 앱에 설정된 오늘의 호출 상한에 도달했습니다.",
  BUSY: "이미 요청이 진행 중입니다. 완료 후 다시 시도해주세요.",
  UPSTREAM_FAILED: "제공처 연결에 실패했습니다. 자동 재시도하지 않았습니다.",
  INVALID_RESPONSE: "제공처 응답 형식을 확인하지 못해 표시를 중단했습니다.",
  INVALID_INPUT: "검색어는 1~80자로 입력해주세요.",
  FORBIDDEN: "이 연결 기능은 로컬 프로그램에서만 사용할 수 있습니다.",
  VAULT_FAILED:
    "암호화 보관함을 읽지 못했습니다. 등록한 Windows 계정에서 다시 실행해주세요.",
  SERVICE_UNAVAILABLE:
    "연결 서버가 꺼져 있습니다. 프로젝트에서 npm start를 실행해주세요.",
};
