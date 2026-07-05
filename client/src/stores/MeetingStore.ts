import Peer from 'peerjs'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import MeetingManager from '../web/MeetingManager'

interface MeetingState {
  meetingDialogOpen: boolean
  joined: boolean
  manager: null | MeetingManager
  activePresenterId: string
  userIds: string[]
  myMediaStream: null | MediaStream
  myScreenStream: null | MediaStream
  peerMediaStreams: Map<
    string,
    {
      stream: MediaStream
      call: Peer.MediaConnection
    }
  >
  screenStream: null | {
    presenterId: string
    stream: MediaStream
    call: Peer.MediaConnection
  }
}

const initialState: MeetingState = {
  meetingDialogOpen: false,
  joined: false,
  manager: null,
  activePresenterId: '',
  userIds: [],
  myMediaStream: null,
  myScreenStream: null,
  peerMediaStreams: new Map(),
  screenStream: null,
}

export const meetingSlice = createSlice({
  name: 'meeting',
  initialState,
  reducers: {
    openMeetingDialog: (state) => {
      state.meetingDialogOpen = true
    },
    closeMeetingDialog: (state) => {
      state.meetingDialogOpen = false
    },
    setMeetingJoined: (state, action: PayloadAction<boolean>) => {
      state.joined = action.payload
    },
    setMeetingManager: (state, action: PayloadAction<MeetingManager | null>) => {
      state.manager = action.payload
    },
    setMeetingUsers: (state, action: PayloadAction<string[]>) => {
      state.userIds = action.payload
    },
    addMeetingUser: (state, action: PayloadAction<string>) => {
      if (!state.userIds.includes(action.payload)) state.userIds.push(action.payload)
    },
    removeMeetingUser: (state, action: PayloadAction<string>) => {
      state.userIds = state.userIds.filter((id) => id !== action.payload)
      state.peerMediaStreams.delete(action.payload)
      if (state.screenStream?.presenterId === action.payload) state.screenStream = null
    },
    setActivePresenterId: (state, action: PayloadAction<string>) => {
      state.activePresenterId = action.payload
      if (!action.payload || state.screenStream?.presenterId !== action.payload) {
        state.screenStream?.call.close()
        state.screenStream = null
      }
    },
    setMyMeetingMediaStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.myMediaStream = action.payload
    },
    setMyMeetingScreenStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.myScreenStream = action.payload
    },
    addMeetingMediaStream: (
      state,
      action: PayloadAction<{ id: string; call: Peer.MediaConnection; stream: MediaStream }>
    ) => {
      state.peerMediaStreams.set(action.payload.id, {
        call: action.payload.call,
        stream: action.payload.stream,
      })
    },
    removeMeetingMediaStream: (state, action: PayloadAction<string>) => {
      state.peerMediaStreams.delete(action.payload)
    },
    setMeetingScreenStream: (
      state,
      action: PayloadAction<{ presenterId: string; call: Peer.MediaConnection; stream: MediaStream }>
    ) => {
      state.screenStream?.call.close()
      state.screenStream = action.payload
    },
    clearMeetingScreenStream: (state, action: PayloadAction<string | undefined>) => {
      if (!action.payload || state.screenStream?.presenterId === action.payload) {
        state.screenStream?.call.close()
        state.screenStream = null
      }
    },
    resetMeetingMedia: (state) => {
      state.joined = false
      state.manager = null
      state.myMediaStream = null
      state.myScreenStream = null
      state.peerMediaStreams.clear()
      state.screenStream?.call.close()
      state.screenStream = null
    },
  },
})

export const {
  openMeetingDialog,
  closeMeetingDialog,
  setMeetingJoined,
  setMeetingManager,
  setMeetingUsers,
  addMeetingUser,
  removeMeetingUser,
  setActivePresenterId,
  setMyMeetingMediaStream,
  setMyMeetingScreenStream,
  addMeetingMediaStream,
  removeMeetingMediaStream,
  setMeetingScreenStream,
  clearMeetingScreenStream,
  resetMeetingMedia,
} = meetingSlice.actions

export default meetingSlice.reducer
