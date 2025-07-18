export class ServerErrorInterface extends Error {
  serverCode: number;

  constructor(message: any, serverCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.serverCode = serverCode;
    Object.setPrototypeOf(this, ServerErrorInterface.prototype);
  }
}
