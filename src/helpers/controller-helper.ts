import ServerHelper from "./server-helper";

abstract class ControllerHelper {
  protected serverHelper: ServerHelper = new ServerHelper();
}

export default ControllerHelper;
