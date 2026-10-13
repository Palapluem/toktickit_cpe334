// supertest listens on every interface but calls 127.0.0.1, so a local service holding that port can answer (#96).
// Bind its throwaway server to 127.0.0.1 and wait for it; the kernel then never hands out a port already in use there.
import type { Server } from 'node:http'
import Test from 'supertest/lib/test.js'

type Patched = {
  serverAddress(app: Server, path: string): string
  end(fn?: (error?: Error) => void): unknown
  url: string
  _server: Server
  _listening?: Promise<void>
}
const proto = Test.prototype as unknown as Patched
const serverAddress = proto.serverAddress
const end = proto.end

proto.serverAddress = function (this: Patched, app, path) {
  if (app.address()) return serverAddress.call(this, app, path)
  this._listening = new Promise<void>((resolve, reject) => {
    app.once('listening', () => resolve())
    app.once('error', reject)
  })
  this._server = app.listen({ port: 0, host: '127.0.0.1' })
  return `http://127.0.0.1:__PORT__${path}`
}

proto.end = function (this: Patched, fn) {
  if (!this._listening) return end.call(this, fn)
  this._listening.then(
    () => {
      this.url = this.url.replace('__PORT__', String((this._server.address() as { port: number }).port))
      end.call(this, fn)
    },
    (error: Error) => fn?.(error),
  )
  return this
}
