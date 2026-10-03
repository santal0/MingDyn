import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, GitCompareArrows, ListFilter, Search, X } from 'lucide-react'
import { matches, useData } from '../data'
import {
  CompareDialog,
  Empty,
  OfficeTable,
  PageHeader,
  Rank,
  ShareButton,
  Sources,
} from '../components'

export function Institutions() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const rank = params.get('rank') || ''
  const query = params.get('q') || ''
  const instId = params.get('institution') || ''
  const affiliation = params.get('affiliation') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const selected = data.institutions.find((i) => i.id === instId)
  const compare = (params.get('compare') || '')
    .split(',')
    .filter((id) => data.offices.some((o) => o.id === id))
    .slice(0, 3)
  const [showCompare, setShowCompare] = useState(false)
  function update(updates: Record<string, string>, replace = false) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(updates))
      value ? next.set(key, value) : next.delete(key)
    if (!('page' in updates)) next.delete('page')
    setParams(next, { replace })
  }
  function toggleCompare(id: string) {
    update({
      compare: (compare.includes(id)
        ? compare.filter((item) => item !== id)
        : [...compare, id].slice(0, 3)
      ).join(','),
    })
  }
  const filtered = data.offices
    .filter(
      (o) =>
        (!category || o.category === category) &&
        (!rank || o.rank === rank) &&
        (!instId || o.institutionId === instId) &&
        (!affiliation || o.affiliation === affiliation) &&
        matches(query, o.title, o.institution, o.affiliation, o.duties, o.sourceGroup),
    )
    .sort((a, b) => a.rankOrder - b.rankOrder || a.row - b.row)
  const pages = Math.max(1, Math.ceil(filtered.length / 40))
  const currentPage = Math.min(page, pages)
  return (
    <>
      <PageHeader eyebrow="官制索引" title="官制机构" action={<ShareButton />}>
        <p>从机构到官职，查阅品级、定员、隶属与职事。共 {data.meta.stats.offices} 条原表记录。</p>
      </PageHeader>
      <div className="catalogue-layout">
        <aside className="directory panel">
          <div className="directory-heading">
            <ListFilter size={17} />
            <strong>机构目录</strong>
          </div>
          <button
            className={`directory-all ${!category && !instId ? 'selected' : ''}`}
            onClick={() => update({ category: '', institution: '', affiliation: '' })}
          >
            全部机构 <span>{data.institutions.length}</span>
          </button>
          {data.categories.map((cat) => (
            <details
              key={cat}
              open={
                category === cat ||
                selected?.category === cat ||
                (!category && !instId && cat === '中央机构')
              }
            >
              <summary>
                {cat}
                <span>{data.institutions.filter((i) => i.category === cat).length}</span>
              </summary>
              <div className="directory-items">
                <button
                  className={!instId && category === cat ? 'selected' : ''}
                  onClick={() => update({ category: cat, institution: '', affiliation: '' })}
                >
                  查看此类全部
                </button>
                {data.institutions
                  .filter((i) => i.category === cat)
                  .map((inst) => (
                    <button
                      key={inst.id}
                      className={inst.id === instId ? 'selected' : ''}
                      onClick={() =>
                        update({ category: cat, institution: inst.id, affiliation: '' })
                      }
                    >
                      {inst.name}
                      <small>{inst.officeIds.length}</small>
                    </button>
                  ))}
              </div>
            </details>
          ))}
        </aside>
        <div className="catalogue-content">
          <section className="filter-panel panel">
            <div className="filter-search">
              <Search size={17} />
              <input
                aria-label="筛选官职"
                placeholder="搜索机构、官职或职责"
                value={query}
                onChange={(e) => update({ q: e.target.value }, true)}
              />
            </div>
            <div className="filter-selects">
              <label>
                分类
                <select
                  aria-label="机构分类"
                  value={category}
                  onChange={(e) =>
                    update({ category: e.target.value, institution: '', affiliation: '' })
                  }
                >
                  <option value="">全部分类</option>
                  {data.categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                品级
                <select
                  aria-label="官职品级"
                  value={rank}
                  onChange={(e) => update({ rank: e.target.value })}
                >
                  <option value="">全部品级</option>
                  {data.ranks.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              {(category || rank || query || instId || affiliation) && (
                <button
                  className="reset-button"
                  onClick={() =>
                    update({ category: '', rank: '', q: '', institution: '', affiliation: '' })
                  }
                >
                  <X size={14} />
                  重置筛选
                </button>
              )}
            </div>
          </section>
          {selected && (
            <section className="institution-summary panel">
              <p className="eyebrow">{selected.category}</p>
              <h2>{selected.name}</h2>
              {selected.descriptions.slice(0, 1).map((d) => (
                <p key={d.source} className="preserve-text">
                  {d.text}
                </p>
              ))}
              {selected.descriptions.length > 1 && (
                <details className="more-descriptions">
                  <summary>展开其他职事说明（{selected.descriptions.length - 1}）</summary>
                  {selected.descriptions.slice(1).map((d) => (
                    <p key={d.source} className="preserve-text">
                      {d.text}
                    </p>
                  ))}
                </details>
              )}
              {selected.notes.map((n) => (
                <p key={n} className="notice">
                  {n}
                </p>
              ))}
              {selected.affiliations.length > 1 && (
                <label className="affiliation-select">
                  按原表隶属继续查看
                  <select
                    aria-label="下属机构"
                    value={affiliation}
                    onChange={(e) => update({ affiliation: e.target.value })}
                  >
                    <option value="">全部隶属条目</option>
                    {selected.affiliations.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
              )}
            </section>
          )}
          <div className="results-toolbar">
            <p aria-live="polite">
              找到 <strong>{filtered.length}</strong> 条官职<span>按品级排序 · 保留重复来源</span>
            </p>
            <span className="compare-hint">勾选至多 3 项比较</span>
          </div>
          <section className="panel table-panel">
            {filtered.length ? (
              <OfficeTable
                offices={filtered.slice((currentPage - 1) * 40, currentPage * 40)}
                compare={compare}
                onCompare={toggleCompare}
              />
            ) : (
              <Empty />
            )}
          </section>
          {pages > 1 && (
            <div className="pagination">
              <button
                className="button button-quiet"
                disabled={currentPage <= 1}
                onClick={() => update({ page: String(currentPage - 1) })}
              >
                上一页
              </button>
              <span>
                {currentPage} / {pages}
              </span>
              <button
                className="button button-quiet"
                disabled={currentPage >= pages}
                onClick={() => update({ page: String(currentPage + 1) })}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>
      {compare.length > 0 && (
        <div className="compare-tray">
          <GitCompareArrows size={20} />
          <span>已选 {compare.length} / 3 项</span>
          <button className="button" onClick={() => setShowCompare(true)}>
            比较官职
          </button>
          <button
            className="icon-button"
            aria-label="清空比较"
            onClick={() => update({ compare: '' })}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {showCompare && (
        <CompareDialog
          ids={compare}
          onClose={() => setShowCompare(false)}
          onRemove={toggleCompare}
        />
      )}
    </>
  )
}

export function OfficeDetail() {
  const data = useData()
  const { id } = useParams()
  const office = data.offices.find((o) => o.id === id)
  if (!office)
    return (
      <>
        <PageHeader eyebrow="官职详情" title="未找到此官职" />
        <Empty>
          <Link to="/institutions">返回官制机构</Link>
        </Empty>
      </>
    )
  const issues = data.issues.filter(
    (i) =>
      i.recordIds.includes(office.id) ||
      i.sources.some((s) => Object.values(office.sources).includes(s)),
  )
  const related = data.offices
    .filter((o) => o.rank === office.rank && o.id !== office.id)
    .slice(0, 6)
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/institutions">官制机构</Link>
        <ChevronRight size={13} />
        <Link to={`/institutions?institution=${office.institutionId}`}>{office.institution}</Link>
        <ChevronRight size={13} />
        <span>官职详情</span>
      </div>
      <PageHeader
        eyebrow={`${office.category} / ${office.institution}`}
        title={office.title}
        action={<ShareButton />}
      />
      <div className="detail-columns">
        <article className="panel detail-article">
          <div className="detail-facts">
            <div>
              <span>品级</span>
              <Rank rank={office.rank} />
            </div>
            <div>
              <span>定员</span>
              <strong>{office.headcount || '原表未列'}</strong>
            </div>
            <div>
              <span>机构</span>
              <Link to={`/institutions?institution=${office.institutionId}`}>
                {office.institution}
              </Link>
            </div>
          </div>
          <h2>隶属</h2>
          <p className="preserve-text">{office.affiliation || '原表未单列隶属字段'}</p>
          <h2>{office.dutiesScope}</h2>
          <p className="preserve-text">{office.duties || '原表未列职事说明。'}</p>
          {office.editorialNote && <p className="notice">{office.editorialNote}</p>}
          <Sources cells={Object.values(office.sources)} />
        </article>
        <aside className="detail-aside">
          <section className="panel">
            <p className="eyebrow">查阅提示</p>
            <h3>品级与职权</h3>
            <p>品级按原表保留，不等同于实际权力。合并官名与“各一人”等定员表述均保留原样。</p>
            <p className="muted">
              原表分类：{office.sourceCategory}
              <br />
              原表官属：{office.sourceGroup}
            </p>
          </section>
          {issues.length > 0 && (
            <section className="panel">
              <h3>整理与核实</h3>
              {issues.map((i) => (
                <div key={i.id} className="issue-note">
                  <span className="tag">{i.kind}</span>
                  <p>{i.message}</p>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
      <section className="related-section">
        <div className="section-title">
          <h2>同品级的其他官职</h2>
          <Link className="text-link" to={`/institutions?rank=${encodeURIComponent(office.rank)}`}>
            查看全部
          </Link>
        </div>
        <div className="panel table-panel">
          <OfficeTable offices={related} />
        </div>
      </section>
    </>
  )
}
