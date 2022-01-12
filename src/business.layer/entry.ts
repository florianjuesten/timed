export type EntryType = 'start' | 'end' | 'overtime'
export interface IEntry {
  id: string
  date: string
  entryTime: string
  entryType: EntryType
  workedTime?: number
  overTime?: number
}
