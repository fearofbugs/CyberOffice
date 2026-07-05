import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface MusicPlaybackState {
  videoId: string
  isPlaying: boolean
  position: number
  updatedAt: number
  updatedBy: string
}

interface MusicState extends MusicPlaybackState {
  panelOpen: boolean
}

const initialState: MusicState = {
  panelOpen: false,
  videoId: '',
  isPlaying: false,
  position: 0,
  updatedAt: 0,
  updatedBy: '',
}

export const musicSlice = createSlice({
  name: 'music',
  initialState,
  reducers: {
    setMusicPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.panelOpen = action.payload
    },
    setMusicState: (state, action: PayloadAction<MusicPlaybackState>) => {
      state.videoId = action.payload.videoId
      state.isPlaying = action.payload.isPlaying
      state.position = action.payload.position
      state.updatedAt = action.payload.updatedAt
      state.updatedBy = action.payload.updatedBy
    },
  },
})

export const { setMusicPanelOpen, setMusicState } = musicSlice.actions

export default musicSlice.reducer
