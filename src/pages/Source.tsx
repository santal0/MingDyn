import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, FileSpreadsheet, Search } from 'lucide-react'
import { asset, matches, useData } from '../data'
import { Empty, PageHeader, Sources } from '../components'
import type { RawSource } from '../types'

export function SourcePage() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const [source, setSource] = useState<RawSource | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const cell = (params.get('cell') || '').toUpperCase()
  const tab = params.get('tab') || (cell ? 'cells' : 'about')
  const query = params.get('q') || ''
  const kind = params.get('kind') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  useEffect(() => {
    if (source) return
    const abort = new AbortController()
    setError(false)
    fetch(asset('data/source.json'), { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error('source')
        return r.json()
      })
      .then(setSource)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true)
      })
    return () => abort.abort()
  }, [retry, source])
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values))
      value ? next.set(key, value) : next.delete(key)
    if (!('page' in values)) next.delete('page')
    setParams(next, { replace: 'q' in values })
  }
  const rawCells = Object.entries(source?.cells || {}).filter(
    ([address, text]) => (!cell || address === cell) && matches(query, address, text),
  )
  const issues = data.issues.filter(
    (i) => (!kind || i.kind === kind) && matches(query, i.message, i.sources.join(' ')),
  )
  const pages = Math.max(1, Math.ceil(rawCells.length / 40))
  const currentPage = Math.min(page, pages)
  const selectedRow = Number(cell.match(/\d+/)?.[0])
  const nearby =
    cell && source
      ? Object.entries(source.cells).filter(
          ([address]) => Number(address.match(/\d+/)?.[0]) === selectedRow && address !== cell,
        )
      : []
  return (
    <>
      <PageHeader
        eyebrow="原文与出处"
        title="原始资料"
        action={
          <a className="button button-quiet" href={asset('Data.xlsx')} download="Data.xlsx">
            <Download size={16} />
            下载 Excel
          </a>
        }
      >
        <p>保留原文，标记整理过程。所有展示内容均可回到原始单元格核对。</p>
      </PageHeader>
      <div className="tabs">
        <button
          className={tab === 'about' ? 'active' : ''}
          onClick={() => update({ tab: 'about', cell: '', q: '' })}
        >
          资料说明
        </button>
        <button
          className={tab === 'cells' ? 'active' : ''}
          onClick={() => update({ tab: 'cells', q: '' })}
        >
          原文查阅
        </button>
        <button
          className={tab === 'issues' ? 'active' : ''}
          onClick={() => update({ tab: 'issues', cell: '', q: '' })}
        >
          整理与待核实 <span>{data.issues.length}</span>
        </button>
      </div>
      {tab === 'about' && (
        <div className="source-about">
          <section className="panel">
            <div className="file-heading">
              <FileSpreadsheet size={38} strokeWidth={1.3} />
              <div>
                <h2>Data.xlsx</h2>
                <p>
                  {data.meta.sheet} · {data.meta.rows} 行 × {data.meta.columns} 列
                </p>
              </div>
            </div>
            <dl className="source-stats">
              <div>
                <dt>非空单元格</dt>
                <dd>{data.meta.stats.sourceCells}</dd>
              </div>
              <div>
                <dt>合并区域</dt>
                <dd>{data.meta.stats.mergedRanges}</dd>
              </div>
              <div>
                <dt>官职条目</dt>
                <dd>{data.meta.stats.offices}</dd>
              </div>
              <div>
                <dt>帝系记录</dt>
                <dd>{data.meta.stats.reigns}</dd>
              </div>
            </dl>
            <p>
              原表将官制、帝系、宗室及制度资料并排编排。本网站按主题整理，保留全部非空单元格原文。
            </p>
            <p className="caption hash-value">文件指纹 SHA-256：{data.meta.sourceHash}</p>
            <div className="chip-row">
              <a
                className="text-link"
                href={asset('data/report.json')}
                download="mingdyn-data-report.json"
              >
                下载整理报告
              </a>
              <a
                className="text-link"
                href={asset('data/catalogue.json')}
                download="mingdyn-catalogue.json"
              >
                下载结构化资料
              </a>
            </div>
          </section>
          <section className="panel editorial-policy">
            <p className="eyebrow">阅读约定</p>
            <h2>如何理解这些资料</h2>
            <ol>
              <li>
                <strong>分类不是隶属。</strong>
                浏览目录按主题组织，实际关系以“隶属”字段和原表说明为据。
              </li>
              <li>
                <strong>条目不等于人数。</strong>
                重复记录和“左、右”等合并官名均被保留，不直接计算全朝编制。
              </li>
              <li>
                <strong>空白不等于不存在。</strong>没有记载的姓名、封号、关系和年代不作补写。
              </li>
              <li>
                <strong>年份保持原表口径。</strong>
                年号、在位时长与起止年份一并展示，不推算精确日期。
              </li>
              <li>
                <strong>原文与整理可区分。</strong>
                异写关联与机构分类调整有说明；拆字、残缺文字与史料疑点另行标注。
              </li>
            </ol>
            <p className="notice">这是一份原表资料的结构化呈现，尚未逐条进行外部史料校勘。</p>
          </section>
          {data.notes.length > 0 && (
            <section className="panel">
              <h2>原表补充说明</h2>
              {data.notes.map((note) => (
                <div key={note.source}>
                  <p>{note.text}</p>
                  <Sources cells={[note.source]} />
                </div>
              ))}
            </section>
          )}
        </div>
      )}
      {tab === 'cells' && (
        <>
          <div className="panel source-filters">
            <div className="filter-search">
              <Search size={17} />
              <input
                aria-label="搜索原文"
                placeholder="搜索单元格编号或原文"
                value={query}
                onChange={(e) => update({ q: e.target.value, cell: '' })}
              />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = new FormData(e.currentTarget)
                update({
                  cell: String(form.get('cell') || '')
                    .trim()
                    .toUpperCase(),
                  q: '',
                })
              }}
            >
              <input
                key={cell}
                name="cell"
                aria-label="单元格位置"
                placeholder="如 B70"
                defaultValue={cell}
              />
              <button className="button button-quiet">定位</button>
            </form>
            {cell && (
              <button className="text-link" onClick={() => update({ cell: '' })}>
                显示全部原文
              </button>
            )}
          </div>
          {error ? (
            <Empty title="原文加载失败">
              <button className="button" onClick={() => setRetry((r) => r + 1)}>
                重新加载原文
              </button>
            </Empty>
          ) : !source ? (
            <div className="panel" role="status">
              正在载入原文…
            </div>
          ) : (
            <>
              <p className="result-count" aria-live="polite">
                {rawCells.length} 个单元格{cell ? ` · ${data.meta.sheet}!${cell}` : ''}
              </p>
              {rawCells.length ? (
                <div className="raw-cells">
                  {rawCells
                    .slice((currentPage - 1) * 40, currentPage * 40)
                    .map(([address, text]) => (
                      <article
                        key={address}
                        className={`panel raw-cell ${address === cell ? 'focused-cell' : ''}`}
                      >
                        <Link to={`/sources?cell=${address}`}>
                          {data.meta.sheet}!{address}
                        </Link>
                        <p>{text}</p>
                      </article>
                    ))}
                </div>
              ) : (
                <Empty title="未找到对应的非空单元格">
                  <p>合并区域的内容保存在左上角单元格。可下载 Excel 查看原始合并范围。</p>
                  {source.merges
                    .filter((range) => isInRange(cell, range))
                    .map((range) => (
                      <p key={range}>
                        所属合并区域：{range}{' '}
                        <Link to={`/sources?cell=${range.split(':')[0]}`}>查看起始单元格</Link>
                      </p>
                    ))}
                </Empty>
              )}
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
              {nearby.length > 0 && (
                <section className="related-section">
                  <h2>同一行的其他原文</h2>
                  <p className="caption">原表横向并排多个主题，同一行不一定属于同一条记录。</p>
                  <div className="raw-cells">
                    {nearby.map(([address, text]) => (
                      <article key={address} className="panel raw-cell">
                        <Link to={`/sources?cell=${address}`}>{address}</Link>
                        <p>{text}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
      {tab === 'issues' && (
        <>
          <div className="source-filters panel">
            <input
              aria-label="搜索整理记录"
              placeholder="搜索问题或单元格"
              value={query}
              onChange={(e) => update({ q: e.target.value })}
            />
            <select
              aria-label="问题类型"
              value={kind}
              onChange={(e) => update({ kind: e.target.value })}
            >
              <option value="">全部类型</option>
              {[...new Set(data.issues.map((i) => i.kind))].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
          <p className="result-count">{issues.length} 条整理记录</p>
          <div className="issue-grid">
            {issues.map((issue) => (
              <article className="panel issue-card" key={issue.id}>
                <span className="tag">{issue.kind}</span>
                <p>{issue.message}</p>
                <Sources cells={issue.sources} />
                <div className="chip-row">
                  {issue.recordIds.map((id) =>
                    data.offices.some((o) => o.id === id) ? (
                      <Link key={id} className="text-link" to={`/offices/${id}`}>
                        查看官职
                      </Link>
                    ) : data.people.some((p) => p.id === id) ? (
                      <Link key={id} className="text-link" to={`/people/${id}`}>
                        查看人物
                      </Link>
                    ) : null,
                  )}
                </div>
              </article>
            ))}
          </div>
          {!issues.length && <Empty />}
        </>
      )}
    </>
  )
}

function isInRange(cell: string, range: string) {
  const pos = (ref: string) => {
    const m = ref.match(/^([A-Z]+)(\d+)$/)
    return m
      ? [Array.from(m[1]).reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0), Number(m[2])]
      : null
  }
  const at = pos(cell),
    start = pos(range.split(':')[0]),
    end = pos(range.split(':')[1])
  return !!(
    at &&
    start &&
    end &&
    at[0] >= start[0] &&
    at[0] <= end[0] &&
    at[1] >= start[1] &&
    at[1] <= end[1]
  )
}
