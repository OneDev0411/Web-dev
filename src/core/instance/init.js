/* @flow */

import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { initLifecycle, callHook } from './lifecycle'
import { mergeOptions } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++
    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        vm.constructor.options,
        options || {},
        vm
      )
    }
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    initLifecycle(vm)
    initEvents(vm)
    callHook(vm, 'init')
    initState(vm)
    callHook(vm, 'created')
    initRender(vm)
  }
}

function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  opts.parent = options.parent
  opts.propsData = options.propsData
  opts._parentVnode = options._parentVnode
  opts._parentListeners = options._parentListeners
  opts._renderChildren = options._renderChildren
  opts._componentTag = options._componentTag
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = opts.staticRenderFns
  }
}
