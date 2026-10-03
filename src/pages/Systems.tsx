import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, ChevronRight, GraduationCap } from 'lucide-react'
import { useData } from '../data'
import { PageHeader, ShareButton, SourceLink, Sources } from '../components'

export function Systems() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'ranks'
  const rank = params.get('rank') || '正五品'
  const stage = params.get('stage') || '童试'
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) next.set(key, value)
    setParams(next)
  }
  const rankRecords = data.systems.filter((s) => s.rank === rank)
  const count = data.offices.filter((o) => o.rank === rank).length
  const exams = data.exams
    .filter((e) => e.stage.includes(stage))
    .sort((a, b) => {
      const order = (place: string) => (place.includes('县试') ? 0 : place.includes('府试') ? 1 : 2)
      return order(a.place) - order(b.place)
    })
  return (
    <>
      <PageHeader eyebrow="制度与入仕" title="品级与科举" action={<ShareButton />}>
        <p>对照文武散阶与勋级，沿考试阶段查阅录取结果和相关官职。</p>
      </PageHeader>
      <div className="tabs">
        <button
          className={tab === 'ranks' ? 'active' : ''}
          onClick={() => update({ tab: 'ranks' })}
        >
          品级对照
        </button>
        <button
          className={tab === 'exams' ? 'active' : ''}
          onClick={() => update({ tab: 'exams' })}
        >
          科举路径
        </button>
        <button
          className={tab === 'titles' ? 'active' : ''}
          onClick={() => update({ tab: 'titles' })}
        >
          宗室封爵
        </button>
      </div>
      {tab === 'ranks' && (
        <>
          <div className="rank-layout">
            <section className="panel rank-picker">
              <p className="eyebrow">选择品级</p>
              <div className="rank-grid">
                {data.ranks.map((r) => (
                  <button
                    key={r}
                    className={r === rank ? 'selected' : ''}
                    onClick={() => update({ rank: r })}
                  >
                    {r}
                    <small>{data.offices.filter((o) => o.rank === r).length} 条官职</small>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel rank-details">
              <div className="section-title">
                <div>
                  <p className="eyebrow">散阶与勋级</p>
                  <h2>{rank}</h2>
                </div>
                <span className="big-rank">{rank.replace('品', '')}</span>
              </div>
              <p className="muted">官职、散阶、勋级分别展示；相同品级不代表相同职权。</p>
              <div className="rank-comparison">
                {['文散阶', '武散阶', '文勋', '武勋'].map((type) => (
                  <div key={type}>
                    <h3>{type}</h3>
                    {rankRecords.filter((s) => s.type === type).length ? (
                      rankRecords
                        .filter((s) => s.type === type)
                        .map((s) => (
                          <div key={s.id}>
                            <p>{s.text.replace(`${rank} `, '')}</p>
                            <SourceLink cell={s.source} />
                          </div>
                        ))
                    ) : (
                      <p className="muted">原表此项未列</p>
                    )}
                  </div>
                ))}
              </div>
              <Link className="button" to={`/institutions?rank=${encodeURIComponent(rank)}`}>
                查看 {count} 条同品级官职 <ArrowUpRight size={16} />
              </Link>
            </section>
          </div>
          <p className="caption">
            “超品”“未入流”“无品级”保留为不同类别。派驻官员的“无品级”是原表表述，不据此判断其本官品级。
          </p>
        </>
      )}
      {tab === 'exams' && (
        <div className="exam-layout">
          <aside className="panel exam-steps">
            <p className="eyebrow">依次查阅</p>
            {[
              { name: '童试', label: '县试 · 府试 · 院试', result: '秀才' },
              { name: '乡试', label: '各省贡院', result: '举人' },
              { name: '会试', label: '京城礼部贡院', result: '贡士' },
              { name: '殿试', label: '廷试定名次', result: '进士' },
            ].map((s, i) => (
              <button
                className={stage === s.name ? 'selected' : ''}
                key={s.name}
                onClick={() => update({ stage: s.name })}
              >
                <span className="step-number">0{i + 1}</span>
                <span>
                  <strong>{s.name}</strong>
                  <small>{s.label}</small>
                </span>
                <span className="step-result">{s.result}</span>
              </button>
            ))}
          </aside>
          <section className="exam-content">
            <div className="exam-intro">
              <GraduationCap size={26} strokeWidth={1.3} />
              <div>
                <h2>{stage}</h2>
                <p>时间、地点和录取结果依原表展示。</p>
              </div>
            </div>
            {exams.map((exam) => (
              <article className="panel exam-card" key={exam.id}>
                <h3>{exam.level === '/' ? exam.place : exam.level}</h3>
                <div className="exam-meta">
                  <span>
                    <strong>地点</strong>
                    {exam.place}
                  </span>
                  <span>
                    <strong>时间</strong>
                    {exam.time}
                  </span>
                </div>
                <p className="preserve-text">{exam.result}</p>
                <div className="chip-row">
                  {['修撰', '编修', '主事', '知县', '推官', '庶吉士', '训导', '县丞']
                    .filter((title) => exam.result.includes(title))
                    .map((title) => (
                      <Link
                        key={title}
                        className="chip"
                        to={`/institutions?q=${encodeURIComponent(title)}`}
                      >
                        查阅{title}
                        <ChevronRight size={13} />
                      </Link>
                    ))}
                </div>
                {data.issues
                  .filter((i) => i.sources.some((s) => Object.values(exam.sources).includes(s)))
                  .map((i) => (
                    <p className="notice" key={i.id}>
                      {i.message}
                    </p>
                  ))}
                <Sources cells={Object.values(exam.sources)} />
              </article>
            ))}
          </section>
        </div>
      )}
      {tab === 'titles' && (
        <>
          <p className="notice">
            以下为原表列出的封爵序列，箭头仅表示原文排列次序，不解释为所有人的自动晋升或世袭规则。
          </p>
          <div className="title-sequences">
            {data.titles.map((t) => (
              <section key={t.label} className="panel">
                <div className="section-title">
                  <h2>{t.label}</h2>
                  <SourceLink cell={t.source} />
                </div>
                <div className="title-chain">
                  {t.sequence.map((title, i) => (
                    <div key={title}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <Link to={`/search?q=${encodeURIComponent(title)}`}>{title}</Link>
                      {i < t.sequence.length - 1 && <ChevronRight size={18} />}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <Link className="text-link" to="/families">
            在宗室谱系中查看人物与封号 <ArrowUpRight size={16} />
          </Link>
        </>
      )}
    </>
  )
}
