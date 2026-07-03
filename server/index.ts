import http from 'http'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { Server, LobbyRoom, MongooseDriver, MatchMakerDriver } from 'colyseus'
import { monitor } from '@colyseus/monitor'
import { RoomType } from '../types/Rooms'

// import socialRoutes from "@colyseus/social/express"

import { SkyOffice } from './rooms/SkyOffice'

const port = Number(process.env.PORT || 2567)
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
const app = express()

app.use(cors())
app.use(express.json())
// app.use(express.static('dist'))

const server = http.createServer(app)

/**
 * Register @colyseus/social routes
 *
 * - uncomment if you want to use default authentication (https://docs.colyseus.io/server/authentication/)
 * - also uncomment the import statement
 */
// app.use("/", socialRoutes);

function createGameServer(driver?: MatchMakerDriver) {
  const gameServer = new Server({
    server,
    ...(driver ? { driver } : {}),
  })

  // register room handlers
  gameServer.define(RoomType.LOBBY, LobbyRoom)
  gameServer.define(RoomType.PUBLIC, SkyOffice, {
    name: 'Public Lobby',
    description: 'For making friends and familiarizing yourself with the controls',
    password: null,
    autoDispose: false,
  })
  gameServer.define(RoomType.CUSTOM, SkyOffice).enableRealtimeListing()

  return gameServer
}

async function createDriver() {
  if (!mongoUri) return undefined

  await mongoose.connect(mongoUri, {
    autoIndex: true,
    useCreateIndex: true,
    useFindAndModify: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  })

  console.log(`Connected to MongoDB at ${mongoUri}`)
  return new MongooseDriver(mongoUri)
}

async function start() {
  const gameServer = createGameServer(await createDriver())

  // register colyseus monitor AFTER registering your room handlers
  app.use('/colyseus', monitor())

  gameServer.listen(port)
  console.log(`Listening on ws://localhost:${port}`)
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
