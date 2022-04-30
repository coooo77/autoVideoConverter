import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import Common from './common'
import { Config } from '../types/config'
import { ChildProcess, fork } from 'child_process'

export default class Main extends Common {
  static currentProcess: ChildProcess | null = null

  static checkTimer: NodeJS.Timeout | null = null

  static configPath = path.join(__dirname, '..', '..')

  static optionalConfigKey = ['__comment', 'exceptions']

  static getConfig() {
    try {
      return this.getFile(this.configPath, 'config') as Config
    } catch (e) {
      this.msg('can not find config.json', 'error')

      this.errorHandler('can not find config.json')

      process.exit(1)
    }
  }

  static checkPrerequisite() {
    const config = this.getConfig()

    this.msg('Check config before app start...')

    const isAbleToRun = this.checkConfigs(config, this.optionalConfigKey)

    if (isAbleToRun) {
      this.msg('App is ready to run..', 'success')
    } else {
      this.msg('Incomplete config, Set App before running', 'error')

      process.exit(1)
    }
  }

  static checkConfigs(obj: any, ignoreKey: string[]) {
    const keys = Object.keys(obj) as string[]

    if (keys.length === 0) return false

    const invalidKeys = []

    for (const key of keys) {
      if (ignoreKey.includes(key)) continue

      const type = typeof obj[key]

      switch (type) {
        case 'string':
          if (Boolean(obj[key])) continue

          invalidKeys.push(key)

          break

        case 'object':
          const isArray = Array.isArray(obj[key])

          const isObj = typeof obj[key] === 'object' && !isArray

          if (isArray && obj[key].length !== 0) continue

          if (isObj && this.checkConfigs(obj[key], ignoreKey)) continue

          invalidKeys.push(key)

          break

        case 'number':
          if (obj[key] > 0) continue

          invalidKeys.push(key)

          break

        default:
          break
      }
    }

    for (const key of invalidKeys) {
      this.msg(`Invalid config key: ${key}`, 'warn')
    }

    return invalidKeys.length === 0
  }

  static async init() {
    process.on('beforeExit', this.handleInterrupt)

    this.setTimer()
  }

  static handleInterrupt() {
    if (this.currentProcess?.pid)
      this.killProcessIfAlive(this.currentProcess.pid)

    if (this.checkTimer) clearTimeout(this.checkTimer)
  }

  static async setTimer() {
    const { checkInterval } = this.getConfig()

    this.handleConvert()

    this.checkTimer = setTimeout(this.setTimer, checkInterval * 1000)
  }

  static handleConvert() {
    if (this.isProcessExist()) return

    const files = this.getFiles()

    if (files.length === 0) return

    console.log('files', files)
  }

  static isProcessExist() {
    return Boolean(this.currentProcess)
  }

  static getFiles() {
    const config = this.getConfig()

    const { sourceFolder, includeExt, exceptions } = config

    return sourceFolder.reduce((filesPath, sourcePath) => {
      const files = fs
        .readdirSync(sourcePath)
        .filter(
          (filename) =>
            this.isValidExtName(filename, includeExt) &&
            this.isValidTarget(filename, exceptions)
        )

      return filesPath.concat(...files)
    }, [] as string[])
  }

  static isValidExtName(filename: string, checkList: string[]) {
    return checkList.includes(path.extname(filename).slice(1))
  }

  static isValidTarget(filename: string, checkList: string[]) {
    for (const world of checkList) {
      if (filename.includes(world)) return false
    }

    return true
  }
}
