import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, GitFork, Minus, Plus, RotateCcw } from 'lucide-react'
import { matches, useData } from '../data'
import { Empty, PageHeader, ShareButton, SourceLink } from '../components'
import type { Family } from '../types'

function FamilyBranch({ family, depth = 0 }: { family: Family; depth?: number }) {
  const data = useData()
  const [expanded, setExpanded] = useState<string[]>([])
  return (
    <div className={`family-branch depth-${Math.min(depth, 1)}`}>
      {depth === 0 && (
        <div className="family-root">
          <span className="eyebrow">{family.era}</span>
          <Link to={`/people/${family.parentId}`}>{family.parentName}</Link>
          <small>
            {family.noChildren ? '原表记载无子' : `${family.children.length} 条子嗣记录`}
          </small>
        </div>
      )}
      {family.noChildren ? (
        <div className="empty-state">
          <p>原表明确记载{family.parentName}无子。</p>
        </div>
      ) : (
        <div className="tree-children">
          {family.children.map((child) => {
            const next = data.families.find((f) => f.parentId === child.personId)
            const open = expanded.includes(child.personId)
            return (
              <div className="tree-child" key={child.id}>
                <div className="person-node">
                  <span className="child-order">{child.order}</span>
                  <Link to={`/people/${child.personId}`}>
                    <strong>{child.name}</strong>
                    <small>{child.description || '原表未列封号'}</small>
                  </Link>
                  {next && (
                    <button
                      className={`icon-button branch-toggle ${open ? 'expanded' : ''}`}
                      aria-label={`${open ? '收起' : '展开'}${child.name}后裔`}
                      aria-expanded={open}
                      onClick={() =>
                        setExpanded(
                          open
                            ? expanded.filter((id) => id !== child.personId)
                            : [...expanded, child.personId],
                        )
                      }
                    >
                      <ChevronDown size={18} />
                    </button>
                  )}
                </div>
                {next && open && <FamilyBranch family={next} depth={depth + 1} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Families() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'families'
  const query = params.get('q') || ''
  const selectedId = params.get('family') || data.families[0].id
  const selected = data.families.find((f) => f.id === selectedId)
  const [zoom, setZoom] = useState(1)
  const char = params.get('char') || ''
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values))
      value ? next.set(key, value) : next.delete(key)
    setParams(next, { replace: 'q' in values })
  }
  const filtered = data.families.filter((f) =>
    matches(query, f.heading, f.parentName, f.children.map((c) => c.raw).join(' ')),
  )
  const generations = data.generations.filter((g) => matches(query, g.house, g.poem))
  const candidates = char ? data.people.filter((p) => p.name.includes(char)) : []
  return (
    <>
      <PageHeader eyebrow="人物与世系" title="宗室谱系" action={<ShareButton />}>
        <p>
          {data.meta.stats.families} 个帝王家庭分组，{data.meta.stats.children}{' '}
          条子嗣记录。逐层展开原表明确记载的亲子关系。
        </p>
      </PageHeader>
      <div className="tabs">
        <button
          className={tab === 'families' ? 'active' : ''}
          onClick={() => update({ tab: 'families', q: '', char: '' })}
        >
          帝王家庭
        </button>
        <button
          className={tab === 'generations' ? 'active' : ''}
          onClick={() => update({ tab: 'generations', q: '' })}
        >
          王房字辈 <span>{data.generations.length}</span>
        </button>
      </div>
      <div className="family-search">
        <input
          aria-label={tab === 'families' ? '筛选家庭' : '筛选字辈'}
          placeholder={tab === 'families' ? '搜索帝王、子嗣或封号' : '搜索王房或字辈文字'}
          value={query}
          onChange={(e) => update({ q: e.target.value })}
        />
      </div>
      {tab === 'families' ? (
        <div className="families-layout">
          <aside className="panel family-directory">
            <p className="eyebrow">选择一个家庭</p>
            {filtered.map((f) => (
              <button
                className={selectedId === f.id ? 'selected' : ''}
                key={f.id}
                onClick={() => {
                  update({ family: f.id })
                  setZoom(1)
                }}
              >
                <span>
                  <strong>{f.parentName}</strong>
                  <small>{f.era}</small>
                </span>
                <span>{f.children.length}</span>
              </button>
            ))}
            {!filtered.length && <Empty />}
          </aside>
          <section className="panel family-canvas">
            {selected ? (
              <>
                <div className="family-canvas-header">
                  <div>
                    <GitFork size={18} />
                    <span>{selected.parentName}的家庭</span>
                  </div>
                  <div className="zoom-controls">
                    <button
                      className="icon-button"
                      aria-label="缩小谱系"
                      disabled={zoom <= 0.75}
                      onClick={() => setZoom((z) => z - 0.25)}
                    >
                      <Minus size={16} />
                    </button>
                    <span aria-live="polite">{Math.round(zoom * 100)}%</span>
                    <button
                      className="icon-button"
                      aria-label="放大谱系"
                      disabled={zoom >= 1.5}
                      onClick={() => setZoom((z) => z + 0.25)}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="重置谱系缩放"
                      onClick={() => setZoom(1)}
                    >
                      <RotateCcw size={15} />
                    </button>
                  </div>
                </div>
                <div className="tree-scroll">
                  <div style={{ zoom }}>
                    <FamilyBranch key={selected.id} family={selected} />
                  </div>
                </div>
                <div className="family-canvas-footer">
                  <p>点击姓名查看人物，展开按钮查看下一代。未载姓名的子嗣保留独立条目。</p>
                  <SourceLink cell={selected.source} />
                </div>
              </>
            ) : (
              <Empty title="未找到此家庭">
                <Link to="/families">返回家庭列表</Link>
              </Empty>
            )}
          </section>
        </div>
      ) : (
        <>
          <p className="muted">
            字序沿用原表。点击一个字可查找姓名中含此字的人物；匹配结果不直接证明同属该王房。
          </p>
          {char && (
            <section className="panel character-results">
              <div className="section-title">
                <h3>姓名中含「{char}」的人物</h3>
                <button className="text-link" onClick={() => update({ char: '' })}>
                  清除
                </button>
              </div>
              {candidates.length ? (
                <div className="chip-row">
                  {candidates.map((p) => (
                    <Link className="chip" key={p.id} to={`/people/${p.id}`}>
                      {p.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p>当前资料没有匹配人物。</p>
              )}
            </section>
          )}
          <div className="generation-grid">
            {generations.map((g) => (
              <article className="panel generation-card" key={g.id}>
                <div className="section-title">
                  <h2>{g.house}</h2>
                  <SourceLink cell={g.source} />
                </div>
                <div className="generation-characters">
                  {g.characters.map((c, i) => (
                    <button
                      className={char === c ? 'selected' : ''}
                      key={i}
                      onClick={() => update({ char: c })}
                      aria-label={`${g.house}第${i + 1}字 ${c}`}
                    >
                      <small>{String(i + 1).padStart(2, '0')}</small>
                      <span>{c}</span>
                    </button>
                  ))}
                </div>
                <p>{g.poem}</p>
              </article>
            ))}
          </div>
          {!generations.length && <Empty />}
        </>
      )}
    </>
  )
}
