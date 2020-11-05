const fs = require('fs')

module.exports = class ReadableStream {
  constructor(path) {
    this.fd

    this.offset = 0
    this.buffer = Buffer.alloc(0)

    return new Promise((resolve, reject) => {
      fs.open(path, (e, fd) => {
        if (e) return reject(e)

        this.fd = fd

        this.block()
        .then(result => {
          resolve(result)
        })
        .catch(reject)
      })        
    })
  }

  async close() {
    fs.closeSync(this.fd)
  }

  async read(bytes) {
    if (bytes > this.buffer.length) {
      this.buffer = Buffer.concat([this.buffer, Buffer.alloc(bytes - this.buffer.length)])
    }

    return new Promise((resolve, reject) => {
      fs.read(this.fd, this.buffer, 0, bytes, this.offset, (e, rbytes, buffer) => {
        if (e) return reject(e)

        this.offset += bytes

        resolve(buffer.slice(0, bytes))
      })
    })
  }

  async get(bytes) {
    if (bytes > this.buffer.length) {
      this.buffer = Buffer.concat([this.buffer, Buffer.alloc(bytes - this.buffer.length)])
    }

    return new Promise((resolve, reject) => {
      fs.read(this.fd, this.buffer, 0, bytes, this.offset, (e, rbytes, buffer) => {
        if (e) return reject(e)

        resolve(buffer.slice(0, bytes))
      })
    })
  }

  async block() {
    let type = (await this.get(1)).readInt8(0)

    if (type !== 0) {
      return null
    }

    this.offset += 1

    let length = (await this.read(4)).readInt32LE(0)
    let counter = 0

    let size = (await this.read(4)).readInt32LE(0)

    let block = {
      [Symbol.asyncIterator]: () => {
        return {
          next: async () => {
            let value = await block.next()
            return Promise.resolve({ value, done: !value })
          }
        }
      },
      length,
      delta: null,
      block: this.block.bind(this),
      metadata: JSON.parse((await this.read(size)).toString('utf-8')),
      next: async () => {
        if (counter++ === length) {
          return null
        }

        return block.delta = await this.delta()
      }
    }

    return block
  }

  async delta() {
    let type = (await this.get(1)).readInt8(0)

    if (type !== 1) {
      return null
    }

    this.offset += 1

    let size = (await this.read(4)).readInt32LE(0)

    return JSON.parse((await this.read(size)).toString('utf-8'))
  }
}