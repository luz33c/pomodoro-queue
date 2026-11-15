export const TODO_ID_CONFLICT = {
  message: "This todo id belongs to another owner"
};

export const TODO_NOT_FOUND = {
  message: "Todo not found"
};

/** oRPC 2.0 ignores `status` on an error definition; server/error-status.ts maps these codes. */
export const TODO_ERROR_STATUS = {
  TODO_ID_CONFLICT: 409,
  TODO_NOT_FOUND: 404
};
