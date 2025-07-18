class RegexHelper {
  static timeFormatRegex = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
  static dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  static phoneFormatRegex = /^\+?[0-9]{10,15}$/;
}

export default RegexHelper;
