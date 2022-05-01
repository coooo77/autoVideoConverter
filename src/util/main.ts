import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import Common from './common'
import { Config } from '../types/config'
import { ChildProcess, fork } from 'child_process'

type FolderPath = string

type Filename = string

export interface FilesToConvert {
  [key: FolderPath]: Filename[]
}

export default class Main {
  static currentProcess: ChildProcess | null = null

  static checkTimer: NodeJS.Timeout | null = null

  static _config: Config[] = []

  static timesOfCheck = 0

  static get config() {
    return Main._config[0]
  }

  static configPath = path.join(__dirname, '..', '..')

  static optionalConfigKey = [
    '__comment',
    'exceptions',
    'ffmpegPath',
    'probePath',
    'screenshotConfig',
    'screenshotFolder',
  ]

  static getConfig() {
    try {
      return Common.getFile(Main.configPath, 'config') as Config
    } catch (e) {
      Common.msg('can not find config.json', 'error')

      Common.errorHandler('can not find config.json')

      process.exit(1)
    }
  }

  static upDateConfig() {
    Main._config = [Main.getConfig()]
  }

  static checkPrerequisite() {
    Main.upDateConfig()

    Common.msg('Check config before app start...')

    const isAbleToRun = Main.checkConfigs(Main.config, Main.optionalConfigKey)

    if (isAbleToRun) {
      Common.msg('App is ready to run..', 'success')
    } else {
      Common.msg('Incomplete config, Set App before running', 'error')

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

          if (isObj && Main.checkConfigs(obj[key], ignoreKey)) continue

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
      Common.msg(`Invalid config key: ${key}`, 'warn')
    }

    return invalidKeys.length === 0
  }

  static async init() {
    process.on('beforeExit', Main.handleInterrupt)

    process.on('SIGINT', Main.handleInterrupt)

    Main.setTimer()
  }

  static handleInterrupt() {
    if (Main.currentProcess?.pid)
      Common.killProcessIfAlive(Main.currentProcess.pid)

    if (Main.checkTimer) clearTimeout(Main.checkTimer)
  }

  static async setTimer() {
    Common.msg(
      `[${Main.timesOfCheck++}] Start to check at ${new Date().toLocaleString()}`
    )

    Main.upDateConfig()

    const { checkInterval } = Main.config

    Main.handleConvert()

    Main.checkTimer = setTimeout(Main.setTimer, checkInterval * 1000)
  }

  static handleConvert() {
    if (Main.isProcessExist())
      return Common.msg('Process is ongoing, skip check ...')

    const files = Main.getFiles()

    if (Object.values(files).every((i) => i.length === 0)) return

    for (const [filePath, filename] of Object.entries(files)) {
      Common.checkMoveFiles(filename, filePath, Main.config.convertFolder)
    }

    const filenames = Object.values(files).reduce(
      (acc, cur) => acc.concat(...cur),
      []
    )

    const payload = JSON.stringify(filenames)

    Main.currentProcess = fork(path.join(__dirname, 'convert.js'), [payload])

    Main.currentProcess.on('error', (error) => {
      Common.errorHandler(error)

      process.exit()
    })

    Main.currentProcess.on('close', (code) => {
      Main.currentProcess?.off('close', () => {})

      Main.currentProcess?.off('error', () => {})

      setTimeout(() => {
        const { keepFile } = Main.config.convertOption

        const { convertFolder, outputFolder } = Main.config

        if (keepFile) {
          Common.checkMoveFiles(filenames, convertFolder, outputFolder)
        } else {
          filenames.forEach((i) => Common.deleteFile(convertFolder, i))
        }

        Main.currentProcess = null
      }, 5 * 1000)
    })
  }

  static isProcessExist() {
    return Boolean(Main.currentProcess)
  }

  static getFiles() {
    const { sourceFolder, includeExt, exceptions } = Main.config

    return sourceFolder.reduce((filesPath, sourcePath) => {
      const files = fs
        .readdirSync(sourcePath)
        .filter(
          (filename) =>
            Main.isValidExtName(filename, includeExt) &&
            Main.isValidTarget(filename, exceptions)
        )

      if (files.length !== 0) filesPath[sourcePath] = files

      return filesPath
    }, {} as FilesToConvert)
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
