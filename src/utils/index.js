import {isFunction, isPlainObject} from './types.js'
import {find} from '../dom/dom.js'

export default {
  // it only does '%s', and return '' when arguments are undefined
  sprintf (_str, ...args) {
    let flag = true
    let i = 0

    const str = _str.replace(/%s/g, () => {
      const arg = args[i++]

      if (typeof arg === 'undefined') {
        flag = false
        return ''
      }
      return arg
    })
    return flag ? str : ''
  },

  getFieldTitle (list, value) {
    for (const item of list) {
      if (item.field === value) {
        return item.title
      }
    }
    return ''
  },

  setFieldIndex (columns) {
    let totalCol = 0
    const flag = []

    for (const column of columns[0]) {
      totalCol += column.colspan || 1
    }

    for (let i = 0; i < columns.length; i++) {
      flag[i] = []
      for (let j = 0; j < totalCol; j++) {
        flag[i][j] = false
      }
    }

    for (let i = 0; i < columns.length; i++) {
      for (const r of columns[i]) {
        const rowspan = r.rowspan || 1
        const colspan = r.colspan || 1
        const index = flag[i].indexOf(false)

        if (colspan === 1) {
          r.fieldIndex = index
          // when field is undefined, use index instead
          if (typeof r.field === 'undefined') {
            r.field = index
          }
        }

        for (let k = 0; k < rowspan; k++) {
          flag[i + k][index] = true
        }
        for (let k = 0; k < colspan; k++) {
          flag[i][index + k] = true
        }
      }
    }
  },

  getScrollBarWidth () {
    if (this.cachedWidth === undefined) {
      const $inner = $('<div/>').addClass('fixed-table-scroll-inner')
      const $outer = $('<div/>').addClass('fixed-table-scroll-outer')

      $outer.append($inner)
      $('body').append($outer)

      const w1 = $inner[0].offsetWidth
      $outer.css('overflow', 'scroll')
      let w2 = $inner[0].offsetWidth

      if (w1 === w2) {
        w2 = $outer[0].clientWidth
      }

      $outer.remove()
      this.cachedWidth = w1 - w2
    }
    return this.cachedWidth
  },

  calculateObjectValue (self, name, args, defaultValue) {
    let func = name

    if (typeof name === 'string') {
      // support obj.func1.func2
      const names = name.split('.')

      if (names.length > 1) {
        func = window
        for (const f of names) {
          func = func[f]
        }
      } else {
        func = window[name]
      }
    }

    if (func !== null && typeof func === 'object') {
      return func
    }

    if (typeof func === 'function') {
      return func.apply(self, args || [])
    }

    if (
      !func &&
      typeof name === 'string' &&
      this.sprintf(name, ...args)
    ) {
      return this.sprintf(name, ...args)
    }

    return defaultValue
  },

  compareObjects (objectA, objectB, compareLength) {
    const aKeys = Object.keys(objectA)
    const bKeys = Object.keys(objectB)

    if (compareLength && aKeys.length !== bKeys.length) {
      return false
    }

    for (const key of aKeys) {
      if (bKeys.includes(key) && objectA[key] !== objectB[key]) {
        return false
      }
    }

    return true
  },

  escapeHTML (text) {
    if (typeof text === 'string') {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/`/g, '&#x60;')
    }
    return text
  },

  getRealDataAttr (dataAttr) {
    for (const [attr, value] of Object.entries(dataAttr)) {
      const auxAttr = attr.split(/(?=[A-Z])/).join('-').toLowerCase()
      if (auxAttr !== attr) {
        dataAttr[auxAttr] = value
        delete dataAttr[attr]
      }
    }
    return dataAttr
  },

  getItemField (item, field, escape) {
    let value = item

    if (typeof field !== 'string' || item.hasOwnProperty(field)) {
      return escape ? this.escapeHTML(item[field]) : item[field]
    }

    const props = field.split('.')
    for (const p of props) {
      value = value && value[p]
    }
    return escape ? this.escapeHTML(value) : value
  },

  isIEBrowser () {
    return navigator.userAgent.includes('MSIE ') ||
      /Trident.*rv:11\./.test(navigator.userAgent)
  },

  findIndex (items, item) {
    for (const it of items) {
      if (JSON.stringify(it) === JSON.stringify(item)) {
        return items.indexOf(it)
      }
    }
    return -1
  },

  trToData (columns, $els) {
    const data = []
    const m = []

    $els.forEach((el, y) => {
      const row = {}

      // save tr's id, class and data-* attributes
      row._id = el.getAtrribute('id')
      row._class = el.getAtrribute('class')
      row._data = this.getRealDataAttr($(el).data())

      find(el, '>td,>th').forEach((el, _x) => {
        const cspan = +el.getAtrribute('colspan') || 1
        const rspan = +el.getAtrribute('rowspan') || 1
        let x = _x

        // skip already occupied cells in current row
        for (; m[y] && m[y][x]; x++) {
          // ignore
        }

        // mark matrix elements occupied by current cell with true
        for (let tx = x; tx < x + cspan; tx++) {
          for (let ty = y; ty < y + rspan; ty++) {
            if (!m[ty]) { // fill missing rows
              m[ty] = []
            }
            m[ty][tx] = true
          }
        }

        const field = columns[x].field

        row[field] = el.innerHTML.trim()
        // save td's id, class and data-* attributes
        row[`_${field}_id`] = el.getAtrribute('id')
        row[`_${field}_class`] = el.getAtrribute('class')
        row[`_${field}_rowspan`] = el.getAtrribute('rowspan')
        row[`_${field}_colspan`] = el.getAtrribute('colspan')
        row[`_${field}_title`] = el.getAtrribute('title')
        row[`_${field}_data`] = this.getRealDataAttr($(el).data())
      })
      data.push(row)
    })

    return data
  },

  extend () {
    let options
    let name
    let src
    let copy
    let copyIsArray
    let clone
    let target = arguments[0] || {}
    let i = 1
    let deep = false
    const length = arguments.length

    // Handle a deep copy situation
    if (typeof target === 'boolean') {
      deep = target

      // skip the boolean and the target
      target = arguments[ i ] || {}
      i++
    }

    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== 'object' && !isFunction(target)) {
      target = {}
    }

    if (i === length) {
      target = this
      i--
    }

    for (; i < length; i++) {
      // Only deal with non-null/undefined values
      if ((options = arguments[i]) !== null) {
        // Extend the base object
        // eslint-disable-next-line guard-for-in
        for (name in options) {
          src = target[name]
          copy = options[name]

          // Prevent never-ending loop
          if (target === copy) {
            continue
          }

          // Recurse if we're merging plain objects or arrays
          if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false
              clone = src && Array.isArray(src) ? src : []
            } else {
              clone = src && isPlainObject(src) ? src : {}
            }

            // Never move original objects, clone them
            target[name] = this.extend( deep, clone, copy )

            // Don't bring in undefined values
          } else if ( copy !== undefined ) {
            target[name] = copy
          }
        }
      }
    }

    // Return the modified object
    return target
  }
}
