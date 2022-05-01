import Main from './main'
import Common from './common'
import ffmpeg from 'fluent-ffmpeg'

const filename = process.argv.slice(2)[0]

const config = Main.getConfig()

const {
  probePath,
  ffmpegPath,
  outputFolder,
  convertFolder,
  screenshotConfig,
  screenshotFolder,
} = config

const {
  ext,
  crf,
  mute,
  preset,
  compress,
  hideCmdWindow,
  suffixForMute,
  suffixForCompress,
} = config.convertOption

const source = `${convertFolder}\\${filename}`

const suffixMute = mute ? suffixForMute : ''

const suffixCompress = compress ? suffixForCompress : ''

const filenameWithoutExt = filename.split('.')[0]

const outputFilename =
  [filenameWithoutExt, suffixMute, suffixCompress]
    .filter((text) => text)
    .join('_') + `.${ext}`

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

if (probePath) ffmpeg.setFfprobePath(probePath)

const handleType = compress
  ? ['-vcodec libx264', `-crf ${crf}`, `-preset ${preset}`]
  : ['-c copy']

const handleMute = mute ? ['-an'] : []

const outputOptions = handleType.concat(handleMute)

const cmd = ffmpeg(source)
  .outputOptions(outputOptions)
  .on('end', process.exit)
  .on('error', (error) => {
    console.dir(error)
    const err = error as { message: string }

    Common.errorHandler(error)

    Common.msg(err.message, 'error')
  })
  .on('start', (commandLine: string) => {
    Common.msg('Spawned Ffmpeg with command: ' + commandLine)

    Common.msg(
      `Start convert file: ${filename} at ${new Date().toLocaleString()}`
    )
  })

if (!hideCmdWindow) {
  cmd.on('progress', (progress) => {
    Common.msg(
      'Processing: ' + String(progress.percent).slice(0, 5) + '% done '
    )
  })
}

if (Object.keys(screenshotConfig).length) {
  const folder = screenshotFolder || outputFolder

  const config = Object.assign(screenshotConfig, { folder })

  cmd.screenshot(config)
}

const outputPath = `${outputFolder}\\${outputFilename}`

cmd.save(outputPath)
