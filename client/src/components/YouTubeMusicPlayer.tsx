import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import CloseIcon from '@mui/icons-material/Close'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { useAppDispatch, useAppSelector } from '../hooks'
import { setMusicPanelOpen } from '../stores/MusicStore'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

const Panel = styled.div<{ $open: boolean }>`
  position: fixed;
  z-index: 10;
  ${(props) =>
    props.$open
      ? `
  right: 16px;
  bottom: 78px;
  width: min(360px, calc(100vw - 32px));
`
      : `
  left: -10000px;
  top: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
`}
  background: #222639;
  color: #eee;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0px 0px 5px #0000006f;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .title {
    font-weight: 700;
  }

  .player {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #111;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 10px;

    .youtube-host,
    iframe {
      width: 100%;
      height: 100%;
    }
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 10px;
  }

  .status {
    margin-top: 8px;
    color: #cfcfcf;
    font-size: 13px;
  }
`

function parseYouTubeVideoId(value: string) {
  const trimmed = value.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) return url.pathname.replace('/', '').slice(0, 11)
    const id = url.searchParams.get('v')
    if (id) return id.slice(0, 11)
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
    if (embedMatch) return embedMatch[1]
  } catch (error) {
    return ''
  }

  return ''
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve()

  return new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(script)
    }
  })
}

export default function YouTubeMusicPlayer() {
  const dispatch = useAppDispatch()
  const music = useAppSelector((state) => state.music)
  const [input, setInput] = useState('')
  const [playerReady, setPlayerReady] = useState(false)
  const playerElementRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const suppressPlayerEventsUntilRef = useRef(0)
  const lastPublishedStateRef = useRef({ isPlaying: false, position: 0, at: 0 })
  const musicRef = useRef(music)
  const game = phaserGame.scene.keys.game as Game | undefined

  useEffect(() => {
    musicRef.current = music
  }, [music])

  useEffect(() => {
    let cancelled = false

    loadYouTubeApi().then(() => {
      if (cancelled || !playerElementRef.current || playerRef.current) return
      playerRef.current = new window.YT.Player(playerElementRef.current, {
        width: '100%',
        height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 0,
          controls: 1,
          fs: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            const iframe = event.target?.getIframe?.()
            iframe?.setAttribute('allowfullscreen', 'true')
            iframe?.setAttribute(
              'allow',
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'
            )
            setPlayerReady(true)
          },
          onStateChange: (event) => {
            if (Date.now() < suppressPlayerEventsUntilRef.current) return
            const playerState = window.YT?.PlayerState
            if (!playerState || !musicRef.current.videoId) return

            const isPlaying =
              event.data === playerState.PLAYING || event.data === playerState.BUFFERING
            const isPaused = event.data === playerState.PAUSED || event.data === playerState.ENDED
            if (!isPlaying && !isPaused) return

            const position = currentTime()
            const last = lastPublishedStateRef.current
            if (
              last.isPlaying === isPlaying &&
              Math.abs(last.position - position) < 1 &&
              Date.now() - last.at < 1000
            ) {
              return
            }

            lastPublishedStateRef.current = { isPlaying, position, at: Date.now() }
            game?.network.updateMusicState({
              isPlaying,
              position,
            })
          },
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const player = playerRef.current
    if (!playerReady || !player || !music.videoId) return

    const position = music.isPlaying
      ? music.position + Math.max(0, Date.now() - music.updatedAt) / 1000
      : music.position

    suppressPlayerEventsUntilRef.current = Date.now() + 1200
    if (music.isPlaying) {
      player.loadVideoById({ videoId: music.videoId, startSeconds: position })
      player.playVideo?.()
    } else {
      player.cueVideoById({ videoId: music.videoId, startSeconds: position })
      player.seekTo?.(position, true)
      player.pauseVideo?.()
    }
  }, [playerReady, music.videoId, music.isPlaying, music.position, music.updatedAt])

  useEffect(() => {
    if (playerReady && !music.videoId) {
      playerRef.current?.stopVideo?.()
    }
  }, [playerReady, music.videoId])

  const currentTime = () => {
    const time = playerRef.current?.getCurrentTime?.()
    return typeof time === 'number' && Number.isFinite(time) ? time : musicRef.current.position
  }

  const setTrack = () => {
    const videoId = parseYouTubeVideoId(input)
    if (!videoId) {
      window.alert('Please enter a valid YouTube URL or video ID')
      return
    }
    game?.network.updateMusicState({ videoId, isPlaying: true, position: 0 })
  }

  const play = () => {
    if (!music.videoId) return
    game?.network.updateMusicState({ isPlaying: true, position: currentTime() })
  }

  const pause = () => {
    if (!music.videoId) return
    game?.network.updateMusicState({ isPlaying: false, position: currentTime() })
  }

  const clear = () => {
    game?.network.updateMusicState({ videoId: '', isPlaying: false, position: 0 })
  }

  return (
    <Panel $open={music.panelOpen}>
      {music.panelOpen && (
        <div className="header">
          <div className="title">Office Music</div>
          <IconButton
            aria-label="close music player"
            size="small"
            onClick={() => dispatch(setMusicPanelOpen(false))}
          >
            <CloseIcon />
          </IconButton>
        </div>
      )}
      <div className="player">
        <div className="youtube-host" ref={playerElementRef} />
      </div>
      {music.panelOpen && (
        <>
          <TextField
            fullWidth
            size="small"
            label="YouTube URL or video ID"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            variant="filled"
          />
          <div className="actions">
            <Button variant="contained" color="secondary" onClick={setTrack}>
              Set track
            </Button>
            <Button
              variant="contained"
              onClick={music.isPlaying ? pause : play}
              disabled={!music.videoId}
            >
              {music.isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button variant="outlined" onClick={clear} disabled={!music.videoId}>
              Clear
            </Button>
          </div>
          <div className="status">
            {music.videoId ? `Current video: ${music.videoId}` : 'No office music selected'}
          </div>
        </>
      )}
    </Panel>
  )
}
