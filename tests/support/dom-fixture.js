import { readFileSync } from 'node:fs';

/** Minimal DOM adapter for application wiring tests, not a browser/layout engine. */
class Element extends EventTarget {
  constructor() {
    super();
    this.attributes = new Map();
    const classes = new Set();
    this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name), toggle(name, force = !classes.has(name)) { if (force) classes.add(name); else classes.delete(name); } };
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.dataset = {};
    this.children = [];
    this.open = false;
    this.textContent = ''; this.innerHTML = ''; this.value = '';
    this.clientWidth = 600; this.clientHeight = 525;
  }
  setAttribute(key, value) { this.attributes.set(key, value); }
  getAttribute(key) { return this.attributes.get(key); }
  removeAttribute(key) { this.attributes.delete(key); }
  focus() { globalThis.document.activeElement = this; }
  append(child) {
    if (child.parentElement) child.parentElement.children = child.parentElement.children.filter(item => item !== child);
    this.children.push(child); child.parentElement = this;
  }
  showModal() { this.open = true; this.focus(); }
  close() { this.open = false; }
  scrollIntoView(options) { this.lastScrollIntoView = options; }
  getBoundingClientRect() { return { left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight, width: this.clientWidth, height: this.clientHeight }; }
  closest(selector) {
    if (selector === 'button') return this.tagName === 'button' ? this : null;
    const keys = [...selector.matchAll(/\[data-([\w-]+)\]/g)].map(match => match[1].replace(/-([a-z])/g, (_whole, letter) => letter.toUpperCase()));
    return keys.some(key => Object.hasOwn(this.dataset, key)) ? this : null;
  }
  insertAdjacentHTML(_where, html) { this.innerHTML += html; }
  setPointerCapture() {}
  getContext() {
    return { clearRect() {}, createRadialGradient: () => ({ addColorStop() {} }), beginPath() {}, arc() {}, fill() {} };
  }
}

export function installDomFixture({ mobile = false } = {}) {
  const shell = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const elements = new Map(), worlds = [];
  for (const match of shell.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
    const element = new Element();
    element.tagName = match[1];
    const id = match[2].match(/\bid="([^"]+)"/)?.[1];
    const world = match[2].match(/data-world="([^"]+)"/)?.[1];
    if (id) { element.id = id; elements.set(id, element); }
    if (world) { element.dataset.world = world; worlds.push(element); }
  }
  const document = new EventTarget();
  document.getElementById = id => {
    if (!elements.has(id)) throw new Error(`Missing element in real application shell: ${id}`);
    return elements.get(id);
  };
  document.querySelectorAll = selector => selector === '[data-world]' ? worlds : [];
  document.activeElement = null;
  document.documentElement = new Element();
  const media = new EventTarget(); media.matches = mobile;
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = document; globalThis.window = new EventTarget();
  globalThis.window.matchMedia = () => media;
  return {
    get: document.getElementById,
    setMobile(value) { media.matches = value; media.dispatchEvent(new Event('change')); },
    input(id, value, event = 'input') {
      const element = document.getElementById(id);
      element.value = String(value); element.dispatchEvent(new Event(event));
    },
    click(id) { document.getElementById(id).dispatchEvent(new Event('click')); },
    delegate(dataset) {
      const button = new Element(); button.tagName = 'button'; button.dataset = dataset;
      const event = new Event('click'); Object.defineProperty(event, 'target', { value: button });
      document.dispatchEvent(event);
    },
    cleanup() {
      for (const key of ['document', 'window']) {
        if (previous[key] === undefined) delete globalThis[key];
        else globalThis[key] = previous[key];
      }
    },
  };
}
