import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, BookOpen, GitFork, Landmark, Search } from 'lucide-react'
import { matches, queryString, useData } from '../data'
import { Empty, PageHeader } from '../components'

export function Home() {
  const data = useData()
  const stats = data.meta.stats
  const max = Math.max(
    ...data.categories.map((c) => data.offices.filter((o) => o.category === c).length),
  )
  return (
    <>
      <section className="intro-panel">
        <div>
          <p className="eyebrow">明代制度与宗室 · 可交互资料集</p>
          <h1 tabIndex={-1}>一朝制度，循迹而读。</h1>
          <p>从一个官职、一位帝王或一支宗室，展开明代的制度与人物脉络。</p>
          <div className="intro-links">
            <Link to="/institutions">
              查阅官制 <ArrowUpRight size={16} />
            </Link>
            <Link to="/timeline">
              浏览帝系 <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <div className="intro-date">
          <span>明</span>
          <p>1368 — 1662</p>
          <small>原表帝系所列年份范围</small>
        </div>
      </section>
      <div className="stat-grid">
        {[
          [stats.offices, '官职条目', '含原表重复与合并记录', '/institutions'],
          [stats.reigns, '帝系记录', `${stats.emperors} 位人物 · 含南明`, '/timeline'],
          [stats.children, '子嗣条目', `${stats.families} 个帝王家庭分组`, '/families'],
          [stats.generations, '王房字辈', '逐字查阅世代序列', '/families?tab=generations'],
        ].map(([number, label, note, url]) => (
          <Link className="stat-card" key={label} to={String(url)}>
            <span>{label}</span>
            <strong>
              {number}
              <small>条 / 组</small>
            </strong>
            <p>{note}</p>
          </Link>
        ))}
      </div>
      <div className="home-columns">
        <section className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">官制索引</p>
              <h2>从机构进入</h2>
            </div>
            <Landmark size={23} strokeWidth={1.4} />
          </div>
          <p className="muted">按浏览主题分类，逐层查看机构、隶属与官职。</p>
          <div className="category-list">
            {data.categories.map((category, index) => {
              const count = data.offices.filter((o) => o.category === category).length
              return (
                <Link
                  key={category}
                  to={`/institutions${queryString({ category })}`}
                  className="category-row"
                >
                  <span className="category-number">0{index + 1}</span>
                  <span className="category-name">
                    {category}
                    <span className="category-bar">
                      <i style={{ width: `${(count / max) * 100}%` }} />
                    </span>
                  </span>
                  <span className="category-count">
                    {count}
                    <small>条</small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              )
            })}
          </div>
        </section>
        <div className="home-aside">
          <section className="panel dynasty-panel">
            <div className="section-title">
              <div>
                <p className="eyebrow">时间与人物</p>
                <h2>沿帝系读宗室</h2>
              </div>
              <GitFork size={22} strokeWidth={1.4} />
            </div>
            <div className="era-preview">
              {['洪武', '永乐', '嘉靖', '崇祯', '永历'].map((era) => {
                const reign = data.reigns.find((r) => r.era === era)!
                return (
                  <Link key={era} to={`/people/${reign.personId}`}>
                    <span className="era-dot" />
                    <small>{reign.start}</small>
                    <strong>{era}</strong>
                    <span>{reign.name}</span>
                  </Link>
                )
              })}
            </div>
            <Link to="/timeline" className="text-link">
              查看完整帝王年表 <ArrowUpRight size={16} />
            </Link>
          </section>
          <section className="panel reading-panel">
            <p className="eyebrow">三条查阅路径</p>
            <h2>从熟悉的名字开始</h2>
            <Link to="/institutions?category=中央机构&q=户部">
              <span>壹</span>
              <div>
                <strong>六部如何分工？</strong>
                <p>从户部职责到各司官职</p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
            <Link to={`/people/${data.reigns.find((r) => r.era === '正统')!.personId}`}>
              <span>贰</span>
              <div>
                <strong>两个年号，一位帝王</strong>
                <p>朱祁镇的正统与天顺</p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/systems?tab=exams">
              <span>叁</span>
              <div>
                <strong>从童试到殿试</strong>
                <p>沿考试阶段查阅入仕路径</p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          </section>
        </div>
      </div>
      <div className="source-note">
        <BookOpen size={20} />
        <div>
          <strong>每条资料都有来处</strong>
          <p>
            保留原表写法与出处，重复、异写及待核实内容另行标注。机构分类用于浏览，不等同于历史隶属关系。
          </p>
        </div>
        <Link to="/sources">查阅原始资料</Link>
      </div>
    </>
  )
}

export function SearchPage() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const type = params.get('type') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const entries = useMemo(
    () => [
      ...data.institutions.map((i) => ({
        id: i.id,
        type: '机构',
        title: i.name,
        description: `${i.category} · ${i.officeIds.length} 条官职`,
        search: i.descriptions.map((d) => d.text).join(' '),
        url: `/institutions?institution=${i.id}`,
      })),
      ...data.offices.map((o) => ({
        id: o.id,
        type: '官职',
        title: o.title,
        description: `${o.category} / ${o.institution} · ${o.rank} · ${o.affiliation || o.sourceGroup}`,
        search: `${o.headcount} ${o.duties}`,
        url: `/offices/${o.id}`,
      })),
      ...data.reigns.map((r) => ({
        id: r.id,
        type: '帝系',
        title: `${r.name} · ${r.era}`,
        description: `${r.title} · ${r.period}`,
        search: `${r.rawName} ${r.posthumous} ${r.dynasty}`,
        url: `/people/${r.personId}`,
      })),
      ...data.people.map((p) => ({
        id: p.id,
        type: '人物',
        title: p.name,
        description: p.aliases.length ? `原表另见：${p.aliases.join('、')}` : '查看人物与家庭关联',
        search: p.aliases.join(' '),
        url: `/people/${p.id}`,
      })),
      ...data.families.flatMap((f) =>
        f.children.map((c) => ({
          id: c.id,
          type: '宗室',
          title: c.raw,
          description: `${f.parentName} · ${f.era}`,
          search: f.heading,
          url: `/people/${c.personId}`,
        })),
      ),
      ...data.generations.map((g) => ({
        id: g.id,
        type: '字辈',
        title: g.house,
        description: g.poem,
        search: '',
        url: `/families?tab=generations&q=${encodeURIComponent(g.house)}`,
      })),
      ...data.systems.map((s) => ({
        id: s.id,
        type: '制度',
        title: `${s.type} · ${s.rank}`,
        description: s.text,
        search: s.kind,
        url: `/systems?tab=ranks&rank=${encodeURIComponent(s.rank)}`,
      })),
      ...data.exams.map((e) => ({
        id: e.id,
        type: '科举',
        title: e.level === '/' ? e.place : e.level,
        description: e.result,
        search: `${e.stage} ${e.place} ${e.time}`,
        url: '/systems?tab=exams',
      })),
      ...data.titles.map((t) => ({
        id: t.source,
        type: '制度',
        title: `宗室封爵 · ${t.label}`,
        description: t.sequence.join(' → '),
        search: '',
        url: '/systems?tab=titles',
      })),
    ],
    [data],
  )
  const results = query.trim()
    ? entries.filter((e) => matches(query, e.title, e.description, e.search))
    : []
  const filtered = type ? results.filter((r) => r.type === type) : results
  const pages = Math.max(1, Math.ceil(filtered.length / 30))
  const currentPage = Math.min(page, pages)
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }
  return (
    <>
      <PageHeader eyebrow="全站检索" title="在图谱中查找">
        <p>搜索官职、职责、姓名、年号、封号或字辈。多个关键词以空格分隔。</p>
      </PageHeader>
      <form
        className="search-form panel"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          update('q', String(form.get('query') || ''))
        }}
      >
        <Search size={21} />
        <input
          key={query}
          name="query"
          aria-label="检索关键词"
          defaultValue={query}
          placeholder="例如：户部 郎中、朱祁镇、永乐"
        />
        <button className="button" type="submit">
          搜索
        </button>
      </form>
      <div className="chip-row" aria-label="搜索结果分类">
        <button className={`chip ${!type ? 'selected' : ''}`} onClick={() => update('type', '')}>
          全部 {results.length}
        </button>
        {[...new Set(results.map((r) => r.type))].map((t) => (
          <button
            className={`chip ${type === t ? 'selected' : ''}`}
            key={t}
            onClick={() => update('type', t)}
          >
            {t} {results.filter((r) => r.type === t).length}
          </button>
        ))}
      </div>
      <p className="result-count" aria-live="polite">
        {query ? `“${query}” · ${filtered.length} 条结果` : '输入关键词开始查阅'}
      </p>
      {filtered.length ? (
        <div className="search-results">
          {filtered.slice((currentPage - 1) * 30, currentPage * 30).map((result) => (
            <Link className="search-result" to={result.url} key={result.id}>
              <span className="result-type">{result.type}</span>
              <div>
                <h3>{result.title}</h3>
                <p>{result.description}</p>
                {query && !matches(query, result.title, result.description) && (
                  <p className="match-snippet">{snippet(result.search, query)}</p>
                )}
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <Empty title={query ? '没有找到匹配的条目' : '从一个关键词开始'} />
      )}
      {pages > 1 && (
        <div className="pagination">
          <button
            className="button button-quiet"
            disabled={currentPage <= 1}
            onClick={() => update('page', String(currentPage - 1))}
          >
            上一页
          </button>
          <span>
            {currentPage} / {pages}
          </span>
          <button
            className="button button-quiet"
            disabled={currentPage >= pages}
            onClick={() => update('page', String(currentPage + 1))}
          >
            下一页
          </button>
        </div>
      )}
    </>
  )
}

function snippet(text: string, query: string) {
  const word = query.trim().split(/\s+/)[0]
  const start = Math.max(0, text.indexOf(word) - 25)
  return `${start ? '…' : ''}${text.slice(start, start + 130)}${text.length > start + 130 ? '…' : ''}`
}
