export type Sources = Record<string, string>
export interface Office {
  id: string
  title: string
  rank: string
  rankOrder: number
  category: string
  sourceCategory: string
  sourceGroup: string
  institution: string
  institutionId: string
  headcount: string
  affiliation: string
  duties: string
  dutiesScope: string
  editorialNote: string
  sources: Sources
  row: number
}
export interface Institution {
  id: string
  name: string
  category: string
  officeIds: string[]
  descriptions: { text: string; source: string }[]
  affiliations: string[]
  notes: string[]
}
export interface Reign {
  id: string
  personId: string
  name: string
  rawName: string
  title: string
  era: string
  period: string
  start: number
  end: number
  posthumous: string
  dynasty: string
  sources: Sources
}
export interface Person {
  id: string
  name: string
  aliases: string[]
  sources: string[]
  reignIds: string[]
  familyIds: string[]
}
export interface Child {
  id: string
  personId: string
  name: string
  order: string
  description: string
  raw: string
  source: string
}
export interface Family {
  id: string
  parentId: string
  parentName: string
  heading: string
  era: string
  source: string
  children: Child[]
  noChildren: boolean
}
export interface Generation {
  id: string
  house: string
  poem: string
  characters: string[]
  source: string
}
export interface System {
  id: string
  kind: string
  type: string
  rank: string
  text: string
  source: string
}
export interface Exam {
  id: string
  stage: string
  place: string
  time: string
  level: string
  result: string
  sources: Sources
}
export interface Issue {
  id: string
  kind: string
  message: string
  sources: string[]
  recordIds: string[]
}
export interface Catalogue {
  meta: {
    schemaVersion: number
    sourceFile: string
    sheet: string
    sourceHash: string
    rows: number
    columns: number
    stats: Record<string, number>
  }
  categories: string[]
  ranks: string[]
  offices: Office[]
  institutions: Institution[]
  reigns: Reign[]
  people: Person[]
  families: Family[]
  generations: Generation[]
  systems: System[]
  titles: { label: string; sequence: string[]; source: string }[]
  exams: Exam[]
  notes: { text: string; source: string }[]
  issues: Issue[]
}
export interface RawSource {
  cells: Record<string, string>
  merges: string[]
}
