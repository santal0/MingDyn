import { useEffect, useState, type FormEvent } from 'react'
import {
  HashRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  GitFork,
  Landmark,
  LayoutGrid,
  Library,
  Menu,
  Search,
  X,
} from 'lucide-react'
import { asset, DataContext, useData } from './data'
import type { Catalogue } from './types'
import { RouteFocus } from './components'
import { Home, SearchPage } from './pages/Home'
import { Institutions, OfficeDetail } from './pages/Institutions'
import { Timeline, PersonDetail } from './pages/Timeline'
import { Families } from './pages/Families'
import { Systems } from './pages/Systems'
import { SourcePage } from './pages/Source'

const nav = [
  { path: '/', label: '总览', subtitle: '从这里开始', icon: LayoutGrid },
  { path: '/institutions', label: '官制机构', subtitle: '中央与地方', icon: Landmark },
  { path: '/timeline', label: '帝王年表', subtitle: '洪武至永历', icon: Library },
  { path: '/families', label: '宗室谱系', subtitle: '亲子与字辈', icon: GitFork },
  { path: '/systems', label: '品级与科举', subtitle: '制度与入仕', icon: BookOpen },
  { path: '/sources', label: '原始资料', subtitle: '查阅与校核', icon: CircleHelp },
]

function Layout() {
  const data = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const [menu, setMenu] = useState(false)
  const [query, setQuery] = useState('')
  useEffect(() => {
    setMenu(false)
  }, [location])
  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenu(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        跳至主要内容
      </a>
      {menu && (
        <button className="nav-backdrop" aria-label="关闭导航菜单" onClick={() => setMenu(false)} />
      )}
      <aside
        className={`sidebar ${menu ? 'is-open' : ''}`}
        aria-label="主导航"
        id="site-navigation"
      >
        <Link to="/" className="brand">
          <span className="brand-seal">明</span>
          <span>
            <strong>明代图谱</strong>
            <small>MING DYNASTY ATLAS</small>
          </span>
        </Link>
        <div className="sidebar-caption">制度与宗室 · 资料索引</div>
        <nav>
          {nav.map(({ path, label, subtitle, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{subtitle}</small>
              </span>
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="small-seal">典</span>
          <p>
            以原表为据
            <br />
            循条目而读
          </p>
          <small>
            {data.meta.stats.offices} 条官职 · {data.meta.stats.reigns} 条帝系
          </small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label={menu ? '关闭导航' : '打开导航'}
              aria-expanded={menu}
              aria-controls="site-navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <span className="topbar-title">明代制度与宗室图谱</span>
          </div>
          <form className="global-search" onSubmit={submit} role="search">
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="搜索全部资料"
              placeholder="搜索官职、人物、年号…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit">检索</button>
          </form>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/institutions" element={<Institutions />} />
            <Route path="/offices/:id" element={<OfficeDetail />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/people/:id" element={<PersonDetail />} />
            <Route path="/families" element={<Families />} />
            <Route path="/systems" element={<Systems />} />
            <Route path="/sources" element={<SourcePage />} />
            <Route
              path="*"
              element={
                <div className="empty-state">
                  <h1 tabIndex={-1}>未找到此页面</h1>
                  <Link to="/">返回总览</Link>
                </div>
              }
            />
          </Routes>
          <RouteFocus />
        </main>
        <footer className="site-footer">
          <span>
            明代图谱 <span className="footer-dot">·</span> 据 Data.xlsx 整理
          </span>
          <Link to="/sources">原文、出处与整理说明</Link>
        </footer>
      </div>
    </div>
  )
}

export function BrowserApp() {
  const [data, setData] = useState<Catalogue | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const abort = new AbortController()
    fetch(asset('data/catalogue.json'), { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((result: Catalogue) => {
        if (result.meta?.schemaVersion !== 1 || !result.offices?.length)
          throw new Error('资料格式不完整')
        setData(result)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setError(error.message)
      })
    return () => abort.abort()
  }, [])
  if (error)
    return (
      <div className="boot-state">
        <span className="brand-seal">明</span>
        <h1>资料加载失败</h1>
        <p>请检查连接后重新加载。</p>
        <p className="muted">{error}</p>
        <button className="button" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    )
  if (!data)
    return (
      <div className="boot-state" role="status">
        <span className="brand-seal">明</span>
        <p>正在展开明代图谱…</p>
      </div>
    )
  // URL-backed inputs must update synchronously, including native checkboxes.
  return (
    <DataContext.Provider value={data}>
      <HashRouter useTransitions={false}>
        <Layout />
      </HashRouter>
    </DataContext.Provider>
  )
}
