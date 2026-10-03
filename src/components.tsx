import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Check, Copy, Search, X } from 'lucide-react'
import { sourceUrl, useData } from './data'
import type { Office } from './types'

export function PageHeader({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        {children && <div className="page-description">{children}</div>}
      </div>
      {action}
    </header>
  )
}
export function SourceLink({ cell, children }: { cell: string; children?: ReactNode }) {
  return (
    <Link className="source-link" to={sourceUrl(cell)}>
      <BookOpen size={13} aria-hidden="true" />
      {children || cell}
    </Link>
  )
}
export function Sources({ cells }: { cells: string[] }) {
  return (
    <div className="source-list">
      <span>原表出处</span>
      {[...new Set(cells)].map((cell) => (
        <SourceLink key={cell} cell={cell} />
      ))}
    </div>
  )
}
export function Empty({
  title = '没有找到匹配的条目',
  children,
}: {
  title?: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <Search size={28} aria-hidden="true" />
      <h3>{title}</h3>
      {children || <p>试试其他关键词，或减少筛选条件。</p>}
    </div>
  )
}
export function Rank({ rank }: { rank: string }) {
  return (
    <Link
      className={`rank-badge ${['超品', '正一品', '从一品', '正二品'].includes(rank) ? 'rank-high' : ''}`}
      to={`/institutions?rank=${encodeURIComponent(rank)}`}
    >
      {rank}
    </Link>
  )
}
export function ShareButton() {
  const [status, setStatus] = useState('')
  return (
    <div className="share-control">
      <button
        className="button button-quiet"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href)
            setStatus('链接已复制')
          } catch {
            setStatus('可复制浏览器地址栏中的链接')
          }
          window.setTimeout(() => setStatus(''), 3500)
        }}
      >
        {status === '链接已复制' ? <Check size={16} /> : <Copy size={16} />}分享此页
      </button>
      <span className="sr-only" role="status">
        {status}
      </span>
      {status && <span className="share-status">{status}</span>}
    </div>
  )
}
export function OfficeTable({
  offices,
  compare,
  onCompare,
}: {
  offices: Office[]
  compare?: string[]
  onCompare?: (id: string) => void
}) {
  return (
    <div className="table-scroll">
      <table className="office-table">
        <thead>
          <tr>
            <th>官职</th>
            <th>品级</th>
            <th>定员</th>
            <th>隶属</th>
            {onCompare && <th>比较</th>}
          </tr>
        </thead>
        <tbody>
          {offices.map((office) => (
            <tr key={office.id}>
              <td>
                <Link className="record-title" to={`/offices/${office.id}`}>
                  {office.title}
                </Link>
                <span className="table-meta">
                  {office.institution} · {office.category}
                </span>
              </td>
              <td>
                <Rank rank={office.rank} />
              </td>
              <td className="headcount">{office.headcount || '原表未列'}</td>
              <td className="affiliation">{office.affiliation || office.sourceGroup}</td>
              {onCompare && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={`比较 ${office.title} ${office.sources.title}`}
                    checked={compare?.includes(office.id) || false}
                    disabled={compare?.length === 3 && !compare.includes(office.id)}
                    onChange={() => onCompare(office.id)}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
export function CompareDialog({
  ids,
  onClose,
  onRemove,
}: {
  ids: string[]
  onClose: () => void
  onRemove: (id: string) => void
}) {
  const data = useData()
  const dialog = useRef<HTMLDialogElement>(null)
  const records = ids
    .map((id) => data.offices.find((o) => o.id === id))
    .filter((r): r is Office => !!r)
  useEffect(() => {
    dialog.current?.showModal()
    return () => dialog.current?.close()
  }, [])
  return (
    <dialog
      className="compare-dialog"
      ref={dialog}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      aria-labelledby="compare-title"
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">并列查阅</p>
          <h2 id="compare-title">官职比较</h2>
        </div>
        <button className="icon-button" aria-label="关闭比较" onClick={onClose}>
          <X />
        </button>
      </div>
      <p className="muted">品级、定员及职事均按原表展示；品级不代表实际权力大小。</p>
      <div className="table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>字段</th>
              {records.map((o) => (
                <th key={o.id}>
                  {o.title}
                  <button
                    className="icon-button"
                    aria-label={`移除 ${o.title}`}
                    onClick={() => {
                      onRemove(o.id)
                      if (records.length === 1) onClose()
                    }}
                  >
                    <X size={14} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['institution', 'rank', 'headcount', 'affiliation', 'duties'] as const).map(
              (key, i) => (
                <tr key={key}>
                  <th>{['机构', '品级', '定员', '隶属', '原表职事'][i]}</th>
                  {records.map((o) => (
                    <td key={o.id}>
                      {o[key] || '原表未列'}
                      {key === 'duties' && o.editorialNote && (
                        <p className="notice">{o.dutiesScope}</p>
                      )}
                    </td>
                  ))}
                </tr>
              ),
            )}
            <tr>
              <th>出处</th>
              {records.map((o) => (
                <td key={o.id}>
                  <Sources cells={Object.values(o.sources)} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </dialog>
  )
}
export function RouteFocus() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
    const title = document.querySelector('h1')?.textContent
    document.title = title ? `${title} · 明代制度与宗室图谱` : '明代制度与宗室图谱'
  }, [pathname])
  return null
}
