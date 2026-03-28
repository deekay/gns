import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, NAME_PATTERN } from "./constants.js";

export function normalizeName(input: string): string {
  const normalized = input.toLowerCase();

  if (!NAME_PATTERN.test(normalized)) {
    throw new Error(
      `invalid GNS name: must be lowercase alphanumeric and ${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} characters`
    );
  }

  return normalized;
}

export function isValidName(input: string): boolean {
  try {
    normalizeName(input);
    return true;
  } catch {
    return false;
  }
}

