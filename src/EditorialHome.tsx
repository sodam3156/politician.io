import { useState } from "react";
import { ArrowRight, ArrowUpRight, HouseLine, Calculator, HandHeart, MagnifyingGlass } from "@phosphor-icons/react";
import { billHref, categories, categoryLabel, type Bill, type Dataset, type Mode } from "./politics";

const illustrations: Record<string, { file: string; alt: string }> = {
  housing: { file: "housing", alt: "주거 정책을 상징하는 아파트 풍경" },
  tax: { file: "tax", alt: "세금 정책을 상징하는 계산기와 노트" },
  care: { file: "care", alt: "돌봄과 지원을 상징하는 두 손" },
};
function PolicyImage({ category, small = false, onUnavailable }: { category: string; small?: boolean; onUnavailable?: () => void }) {
  const [failed, setFailed] = useState(false);
  const asset = illustrations[category];
  return asset && !failed ? <img src={`/images/${asset.file}${small ? "-small" : ""}.webp`} alt={asset.alt} loading={small ? "lazy" : "eager"} onError={() => { setFailed(true); onUnavailable?.(); }} /> : <div className="policy-image-fallback">{categoryLabel(category)}<span>공식 기록에서 시작하는 읽기</span></div>;
}
function LeadFigure({ bill }: { bill: Bill }) {
  const [failed, setFailed] = useState(false);
  const hasImage = !!illustrations[bill.category] && !failed;
  return <figure className="lead-photo">
    <a href={billHref(bill.id)} aria-label={`${bill.title} 상세 보기`}><PolicyImage category={bill.category} onUnavailable={() => setFailed(true)} /></a>
    <figcaption><span>{hasImage ? "정책 주제 이미지 · AI 생성" : "정책 주제 안내 · 대표 이미지 없음"}</span><span>실제 사건을 증명하는 자료가 아닙니다.</span></figcaption>
  </figure>;
}
function Story({ bill }: { bill: Bill }) {
  return <article className="story-item">
    {illustrations[bill.category] && <a className="story-image-link" href={billHref(bill.id)} tabIndex={-1} aria-hidden="true"><PolicyImage category={bill.category} small /></a>}
    <div className="story-copy">
      <span className="eyebrow">{categoryLabel(bill.category)}</span>
      <h3><a href={billHref(bill.id)}>{bill.title}</a></h3>
      <p>{bill.proposer}<br />{bill.date} · {bill.stage}</p>
      <a className="text-link" href={billHref(bill.id)}>발의자와 근거 보기 <ArrowUpRight size={17} /></a>
    </div>
  </article>;
}
export default function EditorialHome({ data, mode, selected, search }: { data: Dataset; mode: Mode; selected?: string; search: () => void }) {
  const bills = data.bills.filter(b => b.mode === mode && (!selected || b.category === selected));
  const lead = bills.find(b => b.category === (selected ?? "housing")) ?? bills[0];
  const priority = (b: Bill) => b.category === "tax" ? 0 : b.category === "care" ? 1 : 2;
  const others = bills.filter(b => b.id !== lead?.id).sort((a, b) => priority(a) - priority(b));
  return <div className="editorial-home">
    <section className="interest-strip" aria-label="관심 정책 선택">
      <div className="interest-intro"><span className="eyebrow">내 생활에서 시작하는 정치</span><h1>어떤 정책이 궁금하세요?</h1></div>
      <div className="interest-options">{categories.slice(0, 3).map((c, i) => {
        const Icon = [HouseLine, Calculator, HandHeart][i];
        return <a key={c.id} className={`interest-option ${selected === c.id ? "selected" : ""}`} href={`#/category/${c.id}`} aria-current={selected === c.id ? "page" : undefined}><Icon size={25} /><span><strong>{c.label}</strong><small>{c.description}</small></span></a>;
      })}</div>
    </section>
    <section className="lead-section">
      <div className="section-heading"><h2>{selected ? categoryLabel(selected) : "오늘, 내 생활에 닿는 정책"}</h2><button className="text-link" onClick={search}>법안·정치인 검색 <MagnifyingGlass size={18} /></button></div>
      {lead ? <div className="lead-grid">
        <article className="lead-copy">
          <span className="eyebrow">{categoryLabel(lead.category)} · {mode === "official" ? "국회 공식 기록" : "가상 시연"}</span>
          <h3><a href={billHref(lead.id)}>{lead.title}</a></h3>
          <p>이 법안은 누가 냈을까요?<br />발의자부터 심사 단계, 정치인의 행보까지 원문 근거를 따라 확인하세요.</p>
          <a className="button primary" href={billHref(lead.id)}>누가 발의했는지 보기 <ArrowRight size={19} /></a>
          <span className="lead-footnote">발의는 통과나 시행을 뜻하지 않습니다.</span>
        </article>
        <LeadFigure key={lead.category} bill={lead} />
        <aside className="lead-sidebar">
          <h3>먼저 확인할 세 가지</h3>
          <ol className="editorial-list">
            <li><span>01</span><div><strong>누가 발의했나요?</strong><p>{lead.proposer}</p></div></li>
            <li><span>02</span><div><strong>언제 제안됐나요?</strong><p>{lead.date} · 의안 {lead.number}</p></div></li>
            <li><span>03</span><div><strong>지금 어느 단계인가요?</strong><p>{lead.stage}{lead.committee && ` · ${lead.committee}`}</p></div></li>
          </ol>
          <a className="text-link" href={billHref(lead.id)}>발의·표결을 구분해서 읽기 <ArrowRight size={17} /></a>
        </aside>
      </div> : <div className="empty-state"><h3>이 분야의 연결된 법안을 아직 찾지 못했습니다.</h3><p>현재 수집 범위의 한계이며, 법안이나 활동이 없다는 뜻은 아닙니다.</p><a className="text-link" href="#/">전체 정책 보기</a></div>}
    </section>
    {!!others.length && <section className="second-section">
      <div><div className="section-heading compact"><h2>다른 정책도 읽어보세요</h2></div><div className="two-stories">{others.slice(0, 2).map(b => <Story key={b.id} bill={b} />)}</div></div>
      <aside className="evidence-teaser"><span className="eyebrow">한 번의 검색에서, 이어지는 기록으로</span><h2>법안 뒤의<br />정치인을 만나다.</h2><p>법안에서 발의자를 열고, 그 사람의 말과 행동을 확인하세요. 관심 있는 정치인은 계속 추적할 수 있습니다.</p><div className="tiny-steps"><span>관심 정책</span><ArrowRight size={15} /><span>발의자</span><ArrowRight size={15} /><span>행보 추적</span></div><a className="text-link" href="#/following">내 추적 보기 <ArrowRight size={17} /></a></aside>
    </section>}
    {others.length > 2 && <section className="more-section"><div className="section-heading"><h2>함께 확인할 공식 의안</h2><span className="section-note">인기 순위가 아닌 수집된 기록</span></div><div className="more-grid">{others.slice(2).map(b => <Story key={b.id} bill={b} />)}</div></section>}
    <aside className="home-source-note"><p>현재 연결된 {data.bills.filter(b => b.mode === mode).length}개 의안의 기록입니다. 전체 의안·전체 경력 분석이 아닙니다. 확인 시점: {new Date(data.recordedAt).toLocaleDateString("ko-KR")}</p><a className="text-link" href="#/data">출처와 연결 관리 <ArrowRight size={16} /></a></aside>
  </div>;
}
