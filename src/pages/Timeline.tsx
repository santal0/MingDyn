import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, GitFork } from 'lucide-react'
import { matches, useData } from '../data'
import { Empty, PageHeader, ShareButton, Sources } from '../components'

export function Timeline() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const dynasty = params.get('dynasty') || ''
  const query = params.get('q') || ''
  const view = params.get('view') || 'timeline'
  const firstYear = Math.min(...data.reigns.map((r) => r.start))
  const lastYear = Math.max(...data.reigns.map((r) => r.end))
  const span = Math.max(1, lastYear - firstYear)
  const ticks = [
    firstYear,
    ...Array.from(
      { length: Math.ceil(span / 50) + 1 },
      (_, i) => Math.ceil(firstYear / 50) * 50 + i * 50,
    ).filter((y) => y > firstYear + span * 0.07 && y < lastYear - span * 0.07),
    lastYear,
  ]
  const filtered = data.reigns
    .filter(
      (r) =>
        (!dynasty || r.dynasty === dynasty) &&
        matches(query, r.name, r.rawName, r.title, r.era, r.posthumous),
    )
    .sort((a, b) => a.start - b.start)
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    setParams(next, { replace: key === 'q' })
  }
  return (
    <>
      <PageHeader eyebrow="时间与人物" title="帝王年表" action={<ShareButton />}>
        <p>
          {data.meta.stats.reigns} 条年号记录，关联 {data.meta.stats.emperors}{' '}
          位人物。时间沿用原表标注，南明并立记录分行呈现。
        </p>
      </PageHeader>
      <div className="timeline-controls panel">
        <div className="chip-row">
          <button
            className={`chip ${!dynasty ? 'selected' : ''}`}
            onClick={() => update('dynasty', '')}
          >
            全部
          </button>
          {['明', '南明（原表）'].map((d) => (
            <button
              key={d}
              className={`chip ${dynasty === d ? 'selected' : ''}`}
              onClick={() => update('dynasty', d)}
            >
              {d}
            </button>
          ))}
        </div>
        <input
          aria-label="筛选帝王年表"
          placeholder="姓名、年号或称谓"
          value={query}
          onChange={(e) => update('q', e.target.value)}
        />
        <div className="segmented">
          <button
            className={view === 'timeline' ? 'selected' : ''}
            onClick={() => update('view', 'timeline')}
          >
            时间轴
          </button>
          <button
            className={view === 'cards' ? 'selected' : ''}
            onClick={() => update('view', 'cards')}
          >
            卡片
          </button>
        </div>
      </div>
      <p className="result-count" aria-live="polite">
        {filtered.length} 条记录 · 年份和时长均为原表记载，不据此推算精确即位日期
      </p>
      {view === 'timeline' ? (
        <section className="panel timeline-panel">
          <div className="timeline-scroll">
            <div className="timeline-chart">
              <div className="timeline-axis">
                <span>帝王 / 年号</span>
                <div>
                  {ticks.map((year) => (
                    <small key={year} style={{ left: `${((year - firstYear) / span) * 100}%` }}>
                      {year}
                    </small>
                  ))}
                </div>
              </div>
              {filtered.map((reign) => (
                <Link
                  to={`/people/${reign.personId}`}
                  className={`timeline-row ${reign.dynasty !== '明' ? 'southern' : ''}`}
                  key={reign.id}
                >
                  <div className="timeline-label">
                    <strong>{reign.era}</strong>
                    <span>{reign.name}</span>
                  </div>
                  <div className="timeline-track">
                    <span
                      className="timeline-bar"
                      style={{
                        left: `${((reign.start - firstYear) / (span + 1)) * 100}%`,
                        width: `${Math.max(0.75, ((reign.end - reign.start + 1) / (span + 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="timeline-years">
                    {reign.start === reign.end ? reign.start : `${reign.start}–${reign.end}`}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div className="reign-grid">
          {filtered.map((r) => (
            <Link className="panel reign-card" key={r.id} to={`/people/${r.personId}`}>
              <p className="eyebrow">
                {r.dynasty} · {r.title}
              </p>
              <h2>{r.era}</h2>
              <strong>{r.name}</strong>
              <p>{r.period}</p>
              <span className="text-link">
                查看人物与宗室 <ChevronRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      )}
      {!filtered.length && <Empty />}
      <p className="caption">
        “惠帝”“复帝”等称谓保持原表写法；涉及异写或待核实信息，可在人物页与原始资料中查看。
      </p>
    </>
  )
}

export function PersonDetail() {
  const data = useData()
  const { id } = useParams()
  const person = data.people.find((p) => p.id === id)
  if (!person)
    return (
      <>
        <PageHeader eyebrow="人物详情" title="未找到此人物" />
        <Empty>
          <Link to="/families">返回宗室谱系</Link>
        </Empty>
      </>
    )
  const reigns = data.reigns.filter((r) => r.personId === person.id)
  const families = data.families.filter((f) => f.parentId === person.id)
  const parents = data.families.filter((f) => f.children.some((c) => c.personId === person.id))
  const issues = data.issues.filter(
    (i) =>
      i.recordIds.includes(person.id) ||
      i.sources.some(
        (s) =>
          person.sources.includes(s) || reigns.some((r) => Object.values(r.sources).includes(s)),
      ),
  )
  return (
    <>
      <div className="breadcrumbs">
        <Link to={reigns.length ? '/timeline' : '/families'}>
          {reigns.length ? '帝王年表' : '宗室谱系'}
        </Link>
        <ChevronRight size={13} />
        <span>人物详情</span>
      </div>
      <PageHeader
        eyebrow={reigns.length ? '帝系人物' : '宗室人物'}
        title={person.name}
        action={<ShareButton />}
      >
        <p>
          {person.aliases.length > 0
            ? `原表另见：${person.aliases.join('、')}`
            : '根据原表明确记载的姓名与亲子关系整理。'}
        </p>
      </PageHeader>
      <div className="detail-columns">
        <div>
          {reigns.map((r) => (
            <section key={r.id} className="panel reign-detail">
              <div className="reign-detail-heading">
                <div>
                  <p className="eyebrow">
                    {r.dynasty} · {r.title}
                  </p>
                  <h2>{r.era}</h2>
                </div>
                <span className="reign-period">{r.period}</span>
              </div>
              <dl>
                <dt>原表名讳</dt>
                <dd>{r.rawName}</dd>
                <dt>原表称谓</dt>
                <dd>{r.title}</dd>
                <dt>谥号</dt>
                <dd>{r.posthumous}</dd>
              </dl>
              <Sources cells={Object.values(r.sources)} />
            </section>
          ))}
          {parents.map((f) => (
            <section className="panel relationship-panel" key={f.id}>
              <p className="eyebrow">原表亲子关系</p>
              <h2>
                父亲：<Link to={`/people/${f.parentId}`}>{f.parentName}</Link>
              </h2>
              {f.children
                .filter((c) => c.personId === person.id)
                .map((c) => (
                  <p key={c.id}>{c.raw}</p>
                ))}
              <Link className="text-link" to={`/families?family=${f.id}`}>
                查看这个家庭 <GitFork size={16} />
              </Link>
            </section>
          ))}
          {families.map((f) => (
            <section className="panel relationship-panel" key={f.id}>
              <div className="section-title">
                <h2>原表所列子嗣</h2>
                <Link className="text-link" to={`/families?family=${f.id}`}>
                  展开谱系
                </Link>
              </div>
              {f.noChildren ? (
                <p>原表明确记载“无子”。</p>
              ) : (
                <div className="child-list">
                  {f.children.map((c) => (
                    <Link key={c.id} to={`/people/${c.personId}`}>
                      <small>{c.order}</small>
                      <strong>{c.name}</strong>
                      <span>{c.description}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
          {!reigns.length && !families.length && !parents.length && (
            <div className="panel">
              <p>原表未提供更多人物关系。</p>
            </div>
          )}
          <Sources cells={person.sources} />
        </div>
        <aside className="detail-aside">
          <section className="panel">
            <h3>以原文为据</h3>
            <p>此处展示原表包含的关系。未记载的父子链条、生卒年月与继位细节不作补写。</p>
            {reigns.length > 1 && (
              <p className="notice">
                同一人物关联 {reigns.length} 条年号记录，分别保留时间与原文。
              </p>
            )}
          </section>
          {issues.length > 0 && (
            <section className="panel">
              <h3>待核实与人名异写</h3>
              {issues.map((i) => (
                <div className="issue-note" key={i.id}>
                  <span className="tag">{i.kind}</span>
                  <p>{i.message}</p>
                  <Sources cells={i.sources} />
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
    </>
  )
}
