import type { Bill } from "./politics";
import { getPolicyBrief, policyHeadline, proposalSource, proposalStatus } from "./policy-briefs";

export function PolicyReadingHeader({ bill }: { bill: Bill }) {
  const brief = getPolicyBrief(bill);
  return <>
    <span className="proposal-status">{proposalStatus(bill)}</span>
    <h1>{policyHeadline(bill)}</h1>
    <p className="policy-deck">{brief?.summary ?? "원문 제목만으로 생활 영향을 추측하지 않습니다. 공식 의안에서 변경 내용을 확인해 주세요."}</p>
  </>;
}

export default function PolicyReading({ bill }: { bill: Bill }) {
  const brief = getPolicyBrief(bill);
  if (!brief) return <aside className="policy-reading"><h2>변경 내용 확인 중</h2><p>아직 검증된 쉬운 설명이 없습니다. 아래 발의·표결 기록과 공식 원문은 확인할 수 있습니다.</p></aside>;
  return <section className="policy-reading" aria-label="생활 변화 설명">
    <div className="policy-audience"><span className="eyebrow">누구와 관련 있나요?</span><p>{brief.audience}</p></div>
    <h2>무엇을 바꾸려는 건가요?</h2>
    <div className="policy-comparison">
      <div><h3>기존에는 <small>제안이유 기준</small></h3><p>{brief.before}</p></div>
      <div><h3>제출된 안에서는</h3><p>{brief.proposed}</p></div>
    </div>
    <div className="policy-meaning"><h2>생활에서는 이렇게 연결됩니다</h2><p>{brief.example}</p></div>
    <aside className="policy-caution"><h3>여기까지는 달라지는 게 아닙니다</h3><p>{brief.caution}</p></aside>
    <details className="policy-source"><summary>법률명과 설명의 근거 확인</summary>
      <p><strong>{bill.title}</strong><br />의안 {bill.number} · {bill.date} 제출</p>
      <p>{brief.reference}를 바탕으로 쉽게 풀어 썼습니다. 원문의 인용이 아닌 편집 설명이며, 확정된 시행 내용이나 개인별 수혜 판정이 아닙니다.</p>
      <p>설명 확인: {brief.reviewedAt} · 심사 과정에서 내용이 바뀔 수 있습니다.</p>
      <a className="text-link" href={proposalSource(brief)} target="_blank" rel="noreferrer">국회에서 제안이유·주요내용 읽기 ↗</a>
    </details>
  </section>;
}
