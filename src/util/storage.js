import {
  GCOOKIE_NAME,
  META_COOKIE,
  KCOOKIE_NAME,
} from './constants'
export class StorageManager {
  static save (key, value) {
    if (!key || !value) {
      return false
    }
    if (this._isLocalStorageSupported()) {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    }
  }

  static read (key) {
    if (!key) {
      return false
    }
    let data = null
    if (this._isLocalStorageSupported()) {
      data = localStorage.getItem(key)
    }
    if (data != null) {
      try {
        data = JSON.parse(data)
      } catch (e) {}
    }
    return data
  }

  static remove (key) {
    if (!key) {
      return false
    }
    if (this._isLocalStorageSupported()) {
      localStorage.removeItem(key)
      return true
    }
  }

  static removeCookie (name, domain) {
    let cookieStr = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;'

    if (domain) {
      cookieStr = cookieStr + ' domain=' + domain + '; path=/'
    }

    document.cookie = cookieStr
  }

  static createCookie (name, value, seconds, domain) {
    let expires = ''
    let domainStr = ''
    if (seconds) {
      let date = new Date()
      date.setTime(date.getTime() + (seconds * 1000))

      expires = '; expires=' + date.toGMTString()
    }

    if (domain) {
      domainStr = '; domain=' + domain
    }

    value = encodeURIComponent(value)

    document.cookie = name + '=' + value + expires + domainStr + '; path=/'
  }

  static readCookie (name) {
    let nameEQ = name + ''
    let ca = document.cookie.split(';')
    for (let idx = 0; idx < ca.length; idx++) {
      let c = ca[idx]
      while (c.charAt(0) == ' ') {
        c = c.substring(1, c.length)
      }
      if (c.indexOf(nameEQ) == 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length))
      }
    }
    return null
  }

  static _isLocalStorageSupported () {
    return 'localStorage' in window && window.localStorage !== null && typeof window.localStorage.setItem === 'function'
  }

  static saveToLSorCookie (property, value) {
    if (val == null) {
      return
    }
    try {
      if (this._isLocalStorageSupported) {
        this.save(property, JSON.stringify(value))
      } else {
        if (property === GCOOKIE_NAME) {
          this.createCookie(property, encodeURIComponent(value), 0, window.location.hostname)
        } else {
          wiz.createCookie(property, encodeURIComponent(JSON.stringify(value)), 0, window.location.hostname)
        }
      }
      window.$ct.globalCache[property] = value
    } catch (e) {}
  }

  static readFromLSorCookie (property) {
    let data
    if (window.$ct.globalCache.hasOwnProperty(property)) {
      return window.$ct.globalCache[property]
    }
    if (this._isLocalStorageSupported()) {
      data = this.read(property)
    } else {
      data = this.readCookie(property)
    }
    if (data != null && data.trim() != '') {
      let value = JSON.parse(decodeURIComponent(data))
      window.$ct.globalCache[property] = value
      return value
    }
  }

  static createBroadCookie (name, value, seconds, domain) { 
    // sets cookie on the base domain. e.g. if domain is baz.foo.bar.com, set cookie on ".bar.com"
    // To update an existing "broad domain" cookie, we need to know what domain it was actually set on.
    // since a retrieved cookie never tells which domain it was set on, we need to set another test cookie
    // to find out which "broadest" domain the cookie was set on. Then delete the test cookie, and use that domain
    // for updating the actual cookie.

    if (domain) {
      let broadDomain = window.$ct.broadDomain
      if (broadDomain == null) {  // if we don't know the broadDomain yet, then find out
        let domainParts = domain.split('.')
        let testBroadDomain = ''
        for (let idx = domainParts.length - 1; idx >= 0; idx--) {
          testBroadDomain = '.' + domainParts[idx] + testBroadDomain

          // only needed if the cookie already exists and needs to be updated. See note above.
          if (this.readCookie(name)) {
            // no guarantee that browser will delete cookie, hence create short lived cookies
            var testCookieName = 'test_' + name + idx
            this.createCookie(testCookieName, value, 10, testBroadDomain) // self-destruct after 10 seconds
            if (!this.readCookie(testCookieName)) {  // if test cookie not set, then the actual cookie wouldn't have been set on this domain either.
              continue
            } else {                                // else if cookie set, then delete the test and the original cookie
              this.removeCookie(testCookieName, testBroadDomain)
            }
          }

          this.createCookie(name, value, seconds, testBroadDomain)
          let tempCookie = this.readCookie(name)
          if (tempCookie == value) {
            broadDomain = testBroadDomain
            break
          }
        }
      } else {
        this.createCookie(name, value, seconds, broadDomain)
      }
    } else {
      this.createCookie(name, value, seconds, domain);
    }
  }

  static getMetaProp (property) {
    let metaObj = this.readFromLSorCookie(META_COOKIE)
    if (metaObj != null) {
      return metaObj[property]
    }
  }

  static setMetaProp (property, value) {
    if (this._isLocalStorageSupported()) {
      let wzrkMetaObj = this.readFromLSorCookie(META_COOKIE)
      if (wzrkMetaObj == null) {
        wzrkMetaObj = {}
      }
      if (value === undefined) {
        delete wzrkMetaObj[property]
      } else {
        wzrkMetaObj[property] = value
      }
      this.saveToLSorCookie(META_COOKIE, wzrkMetaObj)
    }
  }

  static getAndClearMetaProp (property) {
    let value = this.getMetaProp(property)
    this.setMetaProp(property, undefined)
    return value
  }

  static setInstantDeleteFlagInK () {
    let k = this.readFromLSorCookie(KCOOKIE_NAME)
    if (k == null) {
      k = {}
    }
    k['flag'] = true
    this.saveToLSorCookie(KCOOKIE_NAME, k)
  }
}
