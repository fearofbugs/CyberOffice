import React, { useState } from 'react'
import styled from 'styled-components'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import CloseIcon from '@mui/icons-material/Close'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import MeetingManager from '../web/MeetingManager'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  closeMeetingDialog,
  resetMeetingMedia,
  setMeetingManager,
} from '../stores/MeetingStore'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import Video from './Video'

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  padding: 16px 180px 16px 16px;
`

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  background: #222639;
  border-radius: 16px;
  padding: 16px;
  color: #eee;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0px 0px 5px #0000006f;

  .close {
    position: absolute;
    top: 0;
    right: 0;
  }
`

const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding-right: 36px;
`

const Spotlight = styled.div<{ $objectFit: 'cover' | 'contain' }>`
  flex: 1;
  min-height: 0;
  background: #050505;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  video {
    width: 100%;
    height: 100%;
    object-fit: ${(props) => props.$objectFit};
  }

  .empty {
    color: #cfcfcf;
  }
`

const ParticipantGrid = styled.div<{ $tileSize: number; $expanded: boolean }>`
  flex: ${(props) => (props.$expanded ? 1 : 'initial')};
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${(props) => props.$tileSize}px, 1fr));
  gap: 10px;
  max-height: ${(props) => (props.$expanded ? 'none' : '190px')};
  min-height: 0;
  overflow-y: auto;
`

const Participant = styled.button<{ $tileSize: number; $selected: boolean }>`
  height: ${(props) => Math.round(props.$tileSize * 0.65)}px;
  border: ${(props) => (props.$selected ? '2px solid #90caf9' : '0')};
  padding: 0;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    height: 100%;
    color: #cfcfcf;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    text-align: center;
  }

  .name {
    position: absolute;
    left: 8px;
    bottom: 8px;
    padding: 2px 6px;
    border-radius: 4px;
    color: #fff;
    background: rgba(0, 0, 0, 0.55);
    max-width: calc(100% - 16px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const TileSizeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 190px;
  color: #cfcfcf;
  font-size: 13px;
`

const Warning = styled.div`
  background: #5f3b00;
  border: 1px solid #c88925;
  border-radius: 8px;
  color: #fff3d7;
  padding: 8px 12px;
  font-size: 14px;
`

type FocusTarget = 'screen' | 'self' | string | null

export default function MeetingDialog() {
  const dispatch = useAppDispatch()
  const [busy, setBusy] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [tileSize, setTileSize] = useState(190)
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null)
  const sessionId = useAppSelector((state) => state.user.sessionId)
  const playerNameMap = useAppSelector((state) => state.user.playerNameMap)
  const joined = useAppSelector((state) => state.meeting.joined)
  const manager = useAppSelector((state) => state.meeting.manager)
  const activePresenterId = useAppSelector((state) => state.meeting.activePresenterId)
  const myMediaStream = useAppSelector((state) => state.meeting.myMediaStream)
  const myScreenStream = useAppSelector((state) => state.meeting.myScreenStream)
  const peerMediaStreams = useAppSelector((state) => state.meeting.peerMediaStreams)
  const screenStream = useAppSelector((state) => state.meeting.screenStream)

  const game = phaserGame.scene.keys.game as Game | undefined
  const isSecureContext = window.isSecureContext

  const handleJoin = async () => {
    if (!game?.network || !sessionId) return
    setBusy(true)
    try {
      const newManager = manager || new MeetingManager(sessionId, game.network)
      dispatch(setMeetingManager(newManager))
      await newManager.join()
    } catch (error) {
      console.error(error)
      window.alert('Could not join the meeting')
    } finally {
      setBusy(false)
    }
  }

  const handleLeave = () => {
    game?.network.leaveMeeting()
    manager?.leave()
    dispatch(resetMeetingMedia())
  }

  const handleClose = () => {
    if (joined) handleLeave()
    dispatch(closeMeetingDialog())
  }

  const toggleAudio = () => {
    const enabled = !micEnabled
    myMediaStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
    setMicEnabled(enabled)
  }

  const toggleVideo = () => {
    const enabled = !cameraEnabled
    myMediaStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled
    })
    setCameraEnabled(enabled)
  }

  const toggleScreenShare = async () => {
    if (!manager) return
    if (!isSecureContext) {
      window.alert('Screen sharing requires HTTPS or localhost. Use HTTPS for LAN testing.')
      return
    }
    try {
      if (myScreenStream) {
        manager.stopScreenShare()
      } else {
        await manager.startScreenShare()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Screen sharing failed'
      window.alert(message)
      console.error(error)
    }
  }

  const presenterName =
    myScreenStream || activePresenterId === sessionId
      ? 'You'
      : playerNameMap.get(activePresenterId) || 'Presenter'
  const sharedScreenStream = myScreenStream || screenStream?.stream
  const hasLocalVideo = Boolean(myMediaStream?.getVideoTracks().length)
  const hasLocalAudio = Boolean(myMediaStream?.getAudioTracks().length)
  const peerStreamEntries = [...peerMediaStreams.entries()]
  const focusedPeerStream =
    focusTarget && focusTarget !== 'screen' && focusTarget !== 'self'
      ? peerMediaStreams.get(focusTarget)?.stream
      : undefined
  const spotlightStream =
    focusTarget === 'self'
      ? myMediaStream
      : focusTarget && focusTarget !== 'screen'
      ? focusedPeerStream
      : sharedScreenStream
  const spotlightLabel =
    focusTarget === 'self'
      ? 'You'
      : focusTarget && focusTarget !== 'screen'
      ? playerNameMap.get(focusTarget) || 'Guest'
      : `${presenterName} is sharing`
  const spotlightIsScreen = Boolean(spotlightStream && (!focusTarget || focusTarget === 'screen'))
  const showSpotlight = Boolean(spotlightStream)

  return (
    <Backdrop>
      <Wrapper>
        <IconButton aria-label="close meeting" className="close" onClick={handleClose}>
          <CloseIcon />
        </IconButton>

        <Toolbar>
          {!joined ? (
            <Button variant="contained" color="secondary" disabled={busy} onClick={handleJoin}>
              {busy ? 'Joining...' : 'Join meeting'}
            </Button>
          ) : (
            <>
              <Button variant="contained" color="secondary" onClick={handleLeave}>
                Leave meeting
              </Button>
              <Button variant="contained" onClick={toggleScreenShare}>
                {myScreenStream ? 'Stop sharing' : 'Share screen'}
              </Button>
              <IconButton color="inherit" onClick={toggleAudio}>
                {micEnabled ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
              <IconButton color="inherit" onClick={toggleVideo}>
                {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
              {sharedScreenStream && (
                <Button variant="outlined" color="inherit" onClick={() => setFocusTarget('screen')}>
                  Focus screen
                </Button>
              )}
              {focusTarget && (
                <Button variant="outlined" color="inherit" onClick={() => setFocusTarget(null)}>
                  Grid view
                </Button>
              )}
              <TileSizeControl>
                <span>Tile size</span>
                <Slider
                  size="small"
                  min={150}
                  max={360}
                  value={tileSize}
                  onChange={(_, value) => setTileSize(value as number)}
                />
              </TileSizeControl>
            </>
          )}
          <span>{joined ? `${peerMediaStreams.size + 1} in meeting` : 'Room-wide meeting'}</span>
        </Toolbar>

        {!isSecureContext && (
          <Warning>
            Camera, microphone, and screen sharing require HTTPS or localhost. On LAN, use HTTPS
            instead of http://{window.location.hostname}:5173.
          </Warning>
        )}

        {showSpotlight && (
          <Spotlight $objectFit={spotlightIsScreen ? 'contain' : 'cover'}>
            {spotlightStream ? (
            <>
              <Video srcObject={spotlightStream} autoPlay playsInline />
              <div className="empty" style={{ position: 'absolute', left: 12, bottom: 12 }}>
                {spotlightLabel}
              </div>
            </>
            ) : null}
          </Spotlight>
        )}

        <ParticipantGrid $tileSize={tileSize} $expanded={!showSpotlight}>
          {myMediaStream && (
            <Participant
              $tileSize={tileSize}
              $selected={focusTarget === 'self'}
              onClick={() => setFocusTarget('self')}
            >
              {hasLocalVideo ? (
                <Video srcObject={myMediaStream} autoPlay muted playsInline />
              ) : (
                <div className="placeholder">
                  {hasLocalAudio ? 'You joined with microphone only' : 'You joined without media'}
                </div>
              )}
              <div className="name">You</div>
            </Participant>
          )}
          {joined && !myMediaStream && (
            <Participant $tileSize={tileSize} $selected={false} onClick={() => setFocusTarget(null)}>
              <div className="placeholder">You joined without camera or microphone</div>
              <div className="name">You</div>
            </Participant>
          )}
          {peerStreamEntries.map(([id, { stream }]) => (
            <Participant
              key={id}
              $tileSize={tileSize}
              $selected={focusTarget === id}
              onClick={() => setFocusTarget(id)}
            >
              <Video srcObject={stream} autoPlay playsInline />
              <div className="name">{playerNameMap.get(id) || 'Guest'}</div>
            </Participant>
          ))}
        </ParticipantGrid>
      </Wrapper>
    </Backdrop>
  )
}
