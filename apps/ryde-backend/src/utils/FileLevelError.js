export default class FileLevelError extends Error {
  constructor(message) {
    super(message)
    this.code = 406
  }
}
