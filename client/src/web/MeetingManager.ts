import Peer from 'peerjs'
import Network from '../services/Network'
import store from '../stores'
import {
  addMeetingMediaStream,
  clearMeetingScreenStream,
  removeMeetingMediaStream,
  setMeetingScreenStream,
  setMyMeetingMediaStream,
  setMyMeetingScreenStream,
} from '../stores/MeetingStore'
import { sanitizeId } from '../util'

export default class MeetingManager {
  private mediaPeer: Peer
  private screenPeer: Peer
  private mediaCalls = new Map<string, Peer.MediaConnection>()
  private answeredMediaCalls = new Map<string, Peer.MediaConnection>()
  private screenCalls = new Map<string, Peer.MediaConnection>()
  private mediaPeerReady: Promise<void>
  private screenPeerReady: Promise<void>
  private myMediaStream?: MediaStream
  private myScreenStream?: MediaStream

  constructor(private userId: string, private network: Network) {
    this.mediaPeer = new Peer(this.makeMediaPeerId(userId))
    this.screenPeer = new Peer(this.makeScreenPeerId(userId))
    this.mediaPeerReady = this.waitForPeerOpen(this.mediaPeer)
    this.screenPeerReady = this.waitForPeerOpen(this.screenPeer)

    this.mediaPeer.on('error', (err) => {
      console.log('Meeting media peer error', err.type)
      console.error(err)
    })
    this.screenPeer.on('error', (err) => {
      console.log('Meeting screen peer error', err.type)
      console.error(err)
    })

    this.mediaPeer.on('call', (call) => {
      if (this.answeredMediaCalls.has(call.peer)) return

      call.answer(this.myMediaStream)
      this.answeredMediaCalls.set(call.peer, call)
      call.on('stream', (stream) => {
        store.dispatch(
          addMeetingMediaStream({
            id: this.userKeyFromMediaPeerId(call.peer),
            call,
            stream,
          })
        )
      })
      call.on('close', () => {
        store.dispatch(removeMeetingMediaStream(this.userKeyFromMediaPeerId(call.peer)))
        this.answeredMediaCalls.delete(call.peer)
      })
    })

    this.screenPeer.on('call', (call) => {
      call.answer()
      call.on('stream', (stream) => {
        store.dispatch(
          setMeetingScreenStream({
            presenterId: this.userKeyFromScreenPeerId(call.peer),
            call,
            stream,
          })
        )
      })
      call.on('close', () => {
        store.dispatch(clearMeetingScreenStream(this.userKeyFromScreenPeerId(call.peer)))
      })
    })
  }

  async join() {
    if (this.mediaPeer.disconnected) this.mediaPeer.reconnect()
    if (this.screenPeer.disconnected) this.screenPeer.reconnect()

    await Promise.all([this.mediaPeerReady, this.screenPeerReady])

    const stream = await this.getAvailableUserMedia()
    if (stream) {
      this.myMediaStream = stream
      store.dispatch(setMyMeetingMediaStream(stream))
    } else {
      this.myMediaStream = undefined
      store.dispatch(setMyMeetingMediaStream(null))
      console.warn('Joined meeting without camera or microphone')
    }

    this.network.joinMeeting()
    store.getState().meeting.userIds.forEach((id) => this.onUserJoined(id))
    window.setTimeout(() => {
      store.getState().meeting.userIds.forEach((id) => this.onUserJoined(id))
    }, 1000)
  }

  leave() {
    this.stopScreenShare(false)
    this.myMediaStream?.getTracks().forEach((track) => track.stop())
    this.myMediaStream = undefined
    store.dispatch(setMyMeetingMediaStream(null))

    this.mediaCalls.forEach((call) => call.close())
    this.answeredMediaCalls.forEach((call) => call.close())
    this.screenCalls.forEach((call) => call.close())
    this.mediaCalls.clear()
    this.answeredMediaCalls.clear()
    this.screenCalls.clear()
    this.mediaPeer.disconnect()
    this.screenPeer.disconnect()
  }

  async startScreenShare() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Screen sharing is not available in this browser or context')
    }

    await this.screenPeerReady

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    })
    const track = stream.getVideoTracks()[0]
    if (track) track.onended = () => this.stopScreenShare()

    this.stopScreenShare(false)
    this.myScreenStream = stream
    store.dispatch(setMyMeetingScreenStream(stream))
    this.network.startMeetingScreenShare()

    store.getState().meeting.userIds.forEach((id) => this.callScreenPeer(id))
  }

  stopScreenShare(shouldNotifyServer = true) {
    this.myScreenStream?.getTracks().forEach((track) => track.stop())
    this.myScreenStream = undefined
    store.dispatch(setMyMeetingScreenStream(null))
    this.screenCalls.forEach((call) => call.close())
    this.screenCalls.clear()
    if (shouldNotifyServer) this.network.stopMeetingScreenShare()
  }

  onUserJoined(userId: string) {
    if (userId === this.userId) return
    this.callMediaPeer(userId)
    this.callScreenPeer(userId)
  }

  onUserLeft(userId: string) {
    if (userId === this.userId) return
    const mediaPeerId = this.makeMediaPeerId(userId)
    const screenPeerId = this.makeScreenPeerId(userId)
    const userKey = sanitizeId(userId)
    this.mediaCalls.get(mediaPeerId)?.close()
    this.mediaCalls.delete(mediaPeerId)
    this.answeredMediaCalls.get(mediaPeerId)?.close()
    this.answeredMediaCalls.delete(mediaPeerId)
    this.screenCalls.get(screenPeerId)?.close()
    this.screenCalls.delete(screenPeerId)
    store.dispatch(removeMeetingMediaStream(userKey))
    store.dispatch(clearMeetingScreenStream(userKey))
  }

  private callMediaPeer(userId: string, attempt = 0) {
    if (!this.myMediaStream) return

    const peerId = this.makeMediaPeerId(userId)
    const userKey = sanitizeId(userId)
    if (this.mediaCalls.has(peerId)) return

    const call = this.mediaPeer.call(peerId, this.myMediaStream)
    this.mediaCalls.set(peerId, call)
    call.on('stream', (stream) => {
      store.dispatch(addMeetingMediaStream({ id: userKey, call, stream }))
    })
    call.on('close', () => {
      store.dispatch(removeMeetingMediaStream(userKey))
      this.mediaCalls.delete(peerId)
    })
    call.on('error', () => {
      this.mediaCalls.delete(peerId)
      if (attempt < 3) window.setTimeout(() => this.callMediaPeer(userId, attempt + 1), 800)
    })
  }

  private callScreenPeer(userId: string) {
    if (!this.myScreenStream || userId === this.userId) return

    const peerId = this.makeScreenPeerId(userId)
    if (this.screenCalls.has(peerId)) return

    const call = this.screenPeer.call(peerId, this.myScreenStream)
    this.screenCalls.set(peerId, call)
    call.on('close', () => {
      this.screenCalls.delete(peerId)
    })
    call.on('error', () => {
      this.screenCalls.delete(peerId)
    })
  }

  private waitForPeerOpen(peer: Peer) {
    return new Promise<void>((resolve) => {
      if ((peer as any).open) {
        resolve()
        return
      }
      peer.on('open', () => resolve())
    })
  }

  private async getAvailableUserMedia() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      console.warn('Meeting media requires HTTPS or localhost')
      return null
    }

    const constraints: MediaStreamConstraints[] = [
      { video: true, audio: true },
      { video: false, audio: true },
      { video: true, audio: false },
    ]

    for (const constraint of constraints) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraint)
      } catch (error) {
        console.warn('Could not start meeting media with constraints', constraint, error)
      }
    }

    return null
  }

  private makeBaseId(id: string) {
    return id.replace(/[^0-9a-z]/gi, 'G')
  }

  private makeMediaPeerId(id: string) {
    return `${this.makeBaseId(id)}-meeting`
  }

  private makeScreenPeerId(id: string) {
    return `${this.makeBaseId(id)}-meeting-ss`
  }

  private userKeyFromMediaPeerId(peerId: string) {
    return peerId.replace(/-meeting$/, '')
  }

  private userKeyFromScreenPeerId(peerId: string) {
    return peerId.replace(/-meeting-ss$/, '')
  }
}
