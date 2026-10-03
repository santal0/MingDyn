import { createContext, useContext } from 'react'
import type { Catalogue } from './types'

export const DataContext = createContext<Catalogue | null>(null)
export function useData() {
  const data = useContext(DataContext)
  if (!data) throw new Error('资料尚未加载')
  return data
}
export const normalize = (text: string) => text.replace(/\s+/g, '').toLocaleLowerCase()
export function matches(query: string, ...texts: (string | undefined)[]) {
  const haystack = normalize(texts.filter(Boolean).join(' '))
  return query
    .trim()
    .split(/\s+/)
    .every((word) => haystack.includes(normalize(word)))
}
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`
export const sourceUrl = (cell: string) => `/sources?cell=${encodeURIComponent(cell)}`
export function queryString(values: Record<string, string>) {
  const params = new URLSearchParams(Object.entries(values).filter(([, value]) => value))
  return params.size ? `?${params}` : ''
}
