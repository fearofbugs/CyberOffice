import { useEffect, useLayoutEffect, useState } from 'react'
import styled from 'styled-components'
import JoystickItem from './Joystick'

import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

import { useAppSelector } from '../hooks'
import { JoystickMovement } from './Joystick'

const Backdrop = styled.div`
  position: fixed;
  bottom: calc(96px + env(safe-area-inset-bottom));
  right: max(24px, env(safe-area-inset-right));
  max-height: 50%;
  max-width: 100%;
  z-index: 2;
  touch-action: none;
  user-select: none;

  @media (max-width: 700px), (pointer: coarse) {
    bottom: calc(84px + env(safe-area-inset-bottom));
    right: max(18px, env(safe-area-inset-right));
  }
`

const Wrapper = styled.div`
  position: relative;
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
`

const JoystickWrapper = styled.div`
  margin-top: auto;
  align-self: flex-end;
`
export const minimumScreenWidthSize = 650 //px

const isSmallScreen = (smallScreenSize: number) => {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return width <= smallScreenSize
}

export default function MobileVirtualJoystick() {
  const showJoystick = useAppSelector((state) => state.user.showJoystick)
  const showChat = useAppSelector((state) => state.chat.showChat)
  const hasSmallScreen = isSmallScreen(minimumScreenWidthSize)
  const game = phaserGame.scene.keys.game as Game

  useEffect(() => {}, [showJoystick, showChat])

  const handleMovement = (movement: JoystickMovement) => {
    game.myPlayer?.handleJoystickMovement(movement)
  }

  return (
    <Backdrop>
      <Wrapper>
        {!(showChat && hasSmallScreen) && showJoystick && (
          <JoystickWrapper>
            <JoystickItem onDirectionChange={handleMovement}></JoystickItem>
          </JoystickWrapper>
        )}
      </Wrapper>
    </Backdrop>
  )
}
