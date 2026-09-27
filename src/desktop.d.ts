import type { UpdateState } from './components/UpdateBanner'

declare global {
  interface Window {
    saltatrixDesktop?: {
      window: {
        setFullscreen: (enabled: boolean) => Promise<boolean>
      }
      updater: {
        getState: () => Promise<UpdateState>
        check: () => Promise<UpdateState>
        restartAndInstall: () => Promise<void>
        onStatus: (callback: (state: UpdateState) => void) => () => void
      }
    }
  }
}

export {}
