import { UserRole } from "@prisma/client";
import GlobalConstant from "../global-constant";

class ErrorMessageConstant {
  static dataIsBeingUsed: string =
    "This data is already used in other resources. Please update or delete the related data before proceeding.";
  static dateFormatError: string = "Date must be in YYYY-MM-DD format";
  static timeFormatError: string = "must be in HH:mm:ss format";
  static completeTaskFirst: string =
    "Please complete task first before continue";
  static errorDefault: string =
    "Something went wrong. Please try again shortly.";
  static dateError: string =
    "The date you entered is invalid. Please check the format and try again.";
  static invalidRequest: string =
    "This request seems to be invalid. Please check and try again.";
  static phoneNumberNotValid: string =
    "Phone number must be valid (10–15 digits, optional +)";
  static invalidRole: string = "Invalid role.";
  static serviceNameIsRequiredCaregiver: string =
    "Service name is required for caregivers";
  static caregiverIsNotAvailable: string =
    "Caregiver is not available at the selected time";
  static internalServerError: string =
    "Oops! Something went wrong on our end. Please try again later.";
  static errorFind: string =
    "Something went wrong while searching for the data. Please check your input.";
  static errorUpdate: string =
    "Failed to update data. Make sure all fields are correctly filled.";
  static someRequestAreEmpty: string =
    "Some required fields are missing. Please contact support.";
  static duplicatedDate: string =
    "The date is already used by another entry, please choose a different date.";
  static endStarTimeError: string = "End time must be after start time";
  static missingCompletionStatus: string = "Mising completion status";
  static invalidCaregiverUser: string =
    "User is not assigned the caregiver role.";
  static invalidUser(role: UserRole): string {
    return `We couldn’t find the ${role.toLowerCase()} you’re looking for.`;
  }
  static reasonRequired: string = "Reason required for incomplete tasks";
  static visitNotStarted: string = "Visit has not been started yet.";
  static cannotCancelCompletedVisit: string =
    "Cannot cancel a completed visit.";
  static idMustBeNumeric: string = "ID must be a numeric string";
  static dataNotFound(dataName: string = GlobalConstant.data): string {
    return `We couldn’t find the ${dataName} you’re looking for.`;
  }
  static farFromLocation(distance: number): string {
    return `You're ${distance} meters away from the location you're looking for.`;
  }
  static visitAlreadyStarted: string = "Visit already started.";
  static dataAlreadyExists(name: string): string {
    return `${name} already exists, please use another ${name} to continue.`;
  }
  static visitAlreadyEnded: string = "Visit already ended.";
  static cannotStartVisitBefore(bufferMinutes: number): string {
    return `Cannot start visit more than ${bufferMinutes} minutes before scheduled time`;
  }
  static visitMustAtLeast(minutes: number): string {
    return `Visit must last at least ${minutes} minutes`;
  }
  static cannotStartVisitAfter: string =
    "Cannot start visit after scheduled end time";
}

export default ErrorMessageConstant;
