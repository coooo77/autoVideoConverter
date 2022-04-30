import { ScreenshotsConfig } from 'fluent-ffmpeg'

type Preset =
  | 'ultrafast'
  | 'superfast'
  | 'veryfast'
  | 'faster'
  | 'fast'
  | 'medium'
  | 'slow'
  | 'slower'
  | 'veryslow'
  | 'placebo'

interface ConvertOption {
  mute: true
  compress: true
  ext: string
  suffixForMute: string
  suffixForCompress: string
  hideCmdWindow: true
  keepFile: false
  preset: Preset
  crf: number
}

interface Config {
  checkInterval: number
  sourceFolder: string[]
  convertFolder: string
  outputFolder: string
  includeExt: string[]
  exceptions: string[]
  ffmpegPath: string
  probePath: string
  screenshotFolder: string
  screenshotConfig: ScreenshotsConfig
  convertOption: ConvertOption
}
