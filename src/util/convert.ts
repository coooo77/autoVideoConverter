import path from 'path'
import { fork } from 'child_process'

const payload = process.argv.slice(2)

const files = JSON.parse(payload[0]) as string[]

const convert = (filename: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const payload = [filename]

    const cp = fork(path.join(__dirname, 'ffmpegProcess.js'), payload)

    cp.on('close', resolve)

    cp.on('error', reject)
  })

files.reduce(
  (acc, filename) => acc.then(() => convert(filename)),
  Promise.resolve()
)
