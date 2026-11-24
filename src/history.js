export class History {
  #past = [];
  #future = [];

  constructor(limit = 40) {
    this.limit = limit;
  }

  clear() {
    this.#past = [];
    this.#future = [];
  }

  record(state) {
    this.#past.push(state);
    if (this.#past.length > this.limit) this.#past.shift();
    this.#future = [];
  }

  back(current) {
    return this.#step(this.#past, this.#future, current);
  }

  forward(current) {
    return this.#step(this.#future, this.#past, current);
  }

  #step(from, to, current) {
    if (!from.length) return;
    to.push(current());
    return from.pop();
  }
}
