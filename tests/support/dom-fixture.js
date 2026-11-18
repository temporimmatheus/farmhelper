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
    this.textContent = ''; this.innerHTML = ''; this.value = '';
    this.clientWidth = 600; this.clientHeight = 525;
  }
  setAttribute(key, value) { this.attributes.set(key, value); }
  getAttribute(key) { return this.attributes.get(key); }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
  closest(selector) {
    if (selector === 'button') return this.tagName === 'button' ? this : null;
    return ['area', 'mob', 'world'].some(key => Object.hasOwn(this.dataset, key)) ? this : null;
  }
  insertAdjacentHTML(_where, html) { this.innerHTML += html; }
  setPointerCapture() {}
  getContext() {
    return { clearRect() {}, createRadialGradient: () => ({ addColorStop() {} }), beginPath() {}, arc() {}, fill() {} };
  }
}

export function installDomFixture() {
  const shell = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const elements = new Map(), worlds = [];
  for (const match of shell.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
    const element = new Element();
    element.tagName = match[1];
    const id = match[2].match(/\bid="([^"]+)"/)?.[1];
    const world = match[2].match(/data-world="([^"]+)"/)?.[1];
    if (id) elements.set(id, element);
    if (world) { element.dataset.world = world; worlds.push(element); }
  }
  const document = new EventTarget();
  document.getElementById = id => {
    if (!elements.has(id)) throw new Error(`Missing element in real application shell: ${id}`);
    return elements.get(id);
  };
  document.querySelectorAll = selector => selector === '[data-world]' ? worlds : [];
  document.activeElement = null;
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = document; globalThis.window = new EventTarget();
  return {
    get: document.getElementById,
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
