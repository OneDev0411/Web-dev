import { VueSSRServerPlugin } from 'vue-ssr-webpack-plugin'
import { compileWithWebpack } from './compile-with-webpack'
import { createBundleRenderer } from '../../packages/vue-server-renderer'

export function createRenderer (file, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = undefined
  }
  const asBundle = !!(options && options.asBundle)
  if (options) delete options.asBundle

  compileWithWebpack(file, {
    target: 'node',
    devtool: asBundle ? '#source-map' : false,
    output: {
      path: '/',
      filename: 'bundle.js',
      libraryTarget: 'commonjs2'
    },
    externals: [require.resolve('../../dist/vue.runtime.common.js')],
    plugins: asBundle
      ? [new VueSSRServerPlugin()]
      : []
  }, fs => {
    const bundle = asBundle
      ? JSON.parse(fs.readFileSync('/vue-ssr-bundle.json', 'utf-8'))
      : fs.readFileSync('/bundle.js', 'utf-8')
    const renderer = createBundleRenderer(bundle, options)
    cb(renderer)
  })
}

describe('SSR: bundle renderer', () => {
  it('renderToString', done => {
    createRenderer('app.js', renderer => {
      const context = { url: '/test' }
      renderer.renderToString(context, (err, res) => {
        expect(err).toBeNull()
        expect(res).toBe('<div data-server-rendered="true">/test</div>')
        expect(context.msg).toBe('hello')
        done()
      })
    })
  })

  it('renderToStream', done => {
    createRenderer('app.js', renderer => {
      const context = { url: '/test' }
      const stream = renderer.renderToStream(context)
      let res = ''
      stream.on('data', chunk => {
        res += chunk.toString()
      })
      stream.on('end', () => {
        expect(res).toBe('<div data-server-rendered="true">/test</div>')
        expect(context.msg).toBe('hello')
        done()
      })
    })
  })

  it('renderToString catch error', done => {
    createRenderer('error.js', renderer => {
      renderer.renderToString(err => {
        expect(err.message).toBe('foo')
        done()
      })
    })
  })

  it('renderToStream catch error', done => {
    createRenderer('error.js', renderer => {
      const stream = renderer.renderToStream()
      stream.on('error', err => {
        expect(err.message).toBe('foo')
        done()
      })
    })
  })

  it('render with cache (get/set)', done => {
    const cache = {}
    const get = jasmine.createSpy('get')
    const set = jasmine.createSpy('set')
    const options = {
      cache: {
        // async
        get: (key, cb) => {
          setTimeout(() => {
            get(key)
            cb(cache[key])
          }, 0)
        },
        set: (key, val) => {
          set(key, val)
          cache[key] = val
        }
      }
    }
    createRenderer('cache.js', options, renderer => {
      const expected = '<div data-server-rendered="true">/test</div>'
      const key = 'app::1'
      renderer.renderToString((err, res) => {
        expect(err).toBeNull()
        expect(res).toBe(expected)
        expect(get).toHaveBeenCalledWith(key)
        expect(set).toHaveBeenCalledWith(key, expected)
        expect(cache[key]).toBe(expected)
        renderer.renderToString((err, res) => {
          expect(err).toBeNull()
          expect(res).toBe(expected)
          expect(get.calls.count()).toBe(2)
          expect(set.calls.count()).toBe(1)
          done()
        })
      })
    })
  })

  it('render with cache (get/set/has)', done => {
    const cache = {}
    const has = jasmine.createSpy('has')
    const get = jasmine.createSpy('get')
    const set = jasmine.createSpy('set')
    const options = {
      cache: {
        // async
        has: (key, cb) => {
          has(key)
          cb(!!cache[key])
        },
        // sync
        get: key => {
          get(key)
          return cache[key]
        },
        set: (key, val) => {
          set(key, val)
          cache[key] = val
        }
      }
    }
    createRenderer('cache.js', options, renderer => {
      const expected = '<div data-server-rendered="true">/test</div>'
      const key = 'app::1'
      renderer.renderToString((err, res) => {
        expect(err).toBeNull()
        expect(res).toBe(expected)
        expect(has).toHaveBeenCalledWith(key)
        expect(get).not.toHaveBeenCalled()
        expect(set).toHaveBeenCalledWith(key, expected)
        expect(cache[key]).toBe(expected)
        renderer.renderToString((err, res) => {
          expect(err).toBeNull()
          expect(res).toBe(expected)
          expect(has.calls.count()).toBe(2)
          expect(get.calls.count()).toBe(1)
          expect(set.calls.count()).toBe(1)
          done()
        })
      })
    })
  })

  it('renderToString (bundle format with code split)', done => {
    createRenderer('split.js', { asBundle: true }, renderer => {
      const context = { url: '/test' }
      renderer.renderToString(context, (err, res) => {
        expect(err).toBeNull()
        expect(res).toBe('<div data-server-rendered="true">/test<div>async test.woff2 test.png</div></div>')
        done()
      })
    })
  })

  it('renderToStream (bundle format with code split)', done => {
    createRenderer('split.js', { asBundle: true }, renderer => {
      const context = { url: '/test' }
      const stream = renderer.renderToStream(context)
      let res = ''
      stream.on('data', chunk => {
        res += chunk.toString()
      })
      stream.on('end', () => {
        expect(res).toBe('<div data-server-rendered="true">/test<div>async test.woff2 test.png</div></div>')
        done()
      })
    })
  })

  it('renderToString catch error (bundle format with source map)', done => {
    createRenderer('error.js', { asBundle: true }, renderer => {
      renderer.renderToString(err => {
        expect(err.stack).toContain('test/ssr/fixtures/error.js:1:6')
        expect(err.message).toBe('foo')
        done()
      })
    })
  })

  it('renderToString catch error (bundle format with source map)', done => {
    createRenderer('error.js', { asBundle: true }, renderer => {
      const stream = renderer.renderToStream()
      stream.on('error', err => {
        expect(err.stack).toContain('test/ssr/fixtures/error.js:1:6')
        expect(err.message).toBe('foo')
        done()
      })
    })
  })
})
