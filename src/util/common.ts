import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

export default class Common {
  static errorLogPath = path.join(__dirname, '../log')

  static wait(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
  }

  /** @see https://stackoverflow.com/questions/14390930/how-to-check-if-an-arbitrary-pid-is-running-using-node-js */
  static isProcessRunning(pid: number) {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  static killProcessIfAlive(pid: number) {
    if (!Common.isProcessRunning(pid)) return

    process.kill(pid, 'SIGTERM')

    console.log(chalk.bgRed.yellow(`pid: ${pid} killed`))
  }

  static makeDirIfNotExist(fileLocation: string) {
    const dirNames = fileLocation.split(path.sep)

    let dirPath = ''

    for (let dirName of dirNames) {
      dirPath += dirName + path.sep

      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath)
    }
  }

  /**
   * @param fileLocation path of file ex: './model'
   * @param fileName name of file ex: 'user'
   * @param data
   */
  static saveFile(fileLocation: string, fileName: string, data: any) {
    try {
      Common.makeDirIfNotExist(fileLocation)

      fs.writeFileSync(
        `${fileLocation}/${fileName}.json`,
        JSON.stringify(data),
        'utf8'
      )
    } catch (error) {
      Common.errorHandler(error)
    }
  }

  static errorHandler(error: any) {
    const log = JSON.parse(JSON.stringify(error))

    log.date = new Date().toLocaleString()

    log.message = error.message || 'no error message'

    Common.saveFile(Common.errorLogPath, `${new Date().getTime()}`, log)
  }

  static getFile(fileLocation: string, fileName: string) {
    try {
      const result = fs.readFileSync(
        `${fileLocation}\\${fileName}.json`,
        'utf8'
      )

      return JSON.parse(result)
    } catch (error) {
      Common.errorHandler(error)
    }
  }

  static getOrCreateFile<T>(
    fileLocation: string,
    fileName: string,
    defaultData: T
  ): T {
    if (fs.existsSync(`${fileLocation}/${fileName}.json`)) {
      return Common.getFile(fileLocation, fileName)
    }

    Common.saveFile(fileLocation, fileName, defaultData)

    return defaultData
  }
}
