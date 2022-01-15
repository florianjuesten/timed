import { inject, injectable } from 'inversify'
import { IDBService } from '../db/db.service'
import { TYPES } from '../dependency-injection/types'
import { logger } from '../logger'
import { IEntry, EntryType } from './entry'

export interface IEntryManager {
  appendEntry: (entry: IEntry) => void
  calculateWorkForEndDate(endDate: Date): number
  getEntries(count?: number): IEntry[]
  getEntriesByDate(date: Date): IEntry[]
  getLastEntry(): IEntry
  getLastOvertime(): number
  isFirstEntryOfToday(): boolean
  convertToHumanDate(dateString: string): string
  parseOvertime(overTime: number): string
}

@injectable()
export class EntryManager implements IEntryManager {
  private _dbService: IDBService

  constructor(@inject(TYPES.IDBService) dbService: IDBService) {
    this._dbService = dbService
  }

  appendEntry(entry: IEntry) {
    const { id, date, entryTime, entryType, overTime } = entry
    this._dbService.appendEntry(`${id};${date.toUTCString()};${entryTime};${entryTime},${entryType};${overTime};`)
  }

  // TODO: remove this method if not used
  convertToHumanDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      // return formatted date
      return date.toLocaleDateString('de')
    } catch (error) {
      logger.error(error)
      return null
    }
  }

  parseOvertime(overTime: number): string {
    const hours = Math.floor(overTime / 60)
    const mins = overTime % 60
    return `${hours}h ${mins}m`
  }

  getLastEntry(): IEntry {
    const lastEntry = this._dbService.getLastEntry()
    const parsedEntry = this.parseDBEntry(lastEntry)
    return parsedEntry
  }

  getLastOvertime(): number {
    const lastEntry = this.getLastEntry()

    if (lastEntry != null) return this.getLastEntry().overTime
    else return 0
  }

  private parseDBEntry(dbEntry: string): IEntry {
    if (dbEntry == null || dbEntry === '' || dbEntry.length === 0) return null

    const parts = dbEntry.split(';')
    try {
      return {
        id: parts[0],
        date: new Date(parts[1]),
        entryType: parts[4] as EntryType,
        workedTime: parseInt(parts[3]),
        entryTime: parseInt(parts[2], 10),
        overTime: parseInt(parts[5])
      }
    } catch (error) {
      logger.error(`Could not parse entry: ${dbEntry}`, error)
      return null
    }
  }

  getEntries(count?: number): IEntry[] {
    const entries = this._dbService.getEntries(count)

    return entries
      .map((entry) => this.parseDBEntry(entry))
      .sort((entryA, entryB) => {
        return entryA.date > entryB.date ? 1 : -1
      })
  }

  calculateWorkForEndDate(endDate: Date): number {
    const last10Entries = this.getEntries(10)
    let workedTime = 0
    if (last10Entries.length > 0) {
      for (let i = last10Entries.length - 1; i >= 0; i--) {
        try {
          const lastEntry = last10Entries[i]
          const lastDate = lastEntry.date
          const lastHours = parseInt(`${lastEntry.entryTime}`.substring(0, 2))
          const lastMinutes = parseInt(`${lastEntry.entryTime}`.substring(3, 5))
          const normalizedLastDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate(), lastHours, lastMinutes)
          if (
            lastEntry.entryType === 'start' &&
            normalizedLastDate.getDate() === endDate.getDate() &&
            normalizedLastDate.getMonth() === endDate.getMonth() &&
            normalizedLastDate.getFullYear() === endDate.getFullYear()
          ) {
            workedTime = (endDate.getTime() - normalizedLastDate.getTime()) / (1000 * 60 * 60)
            workedTime = workedTime * 60
            break
          }
        } catch (error) {
          logger.error(error)
        }
      }
    }
    return workedTime
  }

  isFirstEntryOfToday(): boolean {
    const last10Entries = this.getEntries(10)
    if (last10Entries.length > 0) {
      const lastEntry = last10Entries[0]
      const lastDate = lastEntry.date
      const today = new Date()
      if (lastDate.getFullYear() === today.getFullYear() && lastDate.getMonth() === today.getMonth() && lastDate.getDate() === today.getDate()) return false
    }
    return true
  }

  getEntriesByDate(date: Date): IEntry[] {
    const dbEntriesByDate = this._dbService.getEntriesByUTCDate(date.toUTCString())
    return dbEntriesByDate.map((dbEntry) => this.parseDBEntry(dbEntry))
  }
}
