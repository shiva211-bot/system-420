export const STATUS_PAGES = {
  "400": {
    title: "Bad request",
    message: "The uplink payload was malformed or too large. Refresh and try again from a valid grid address.",
  },
  "401": {
    title: "Unauthorized",
    message: "This sector needs a verified operator session. Sign in, then retry the link.",
  },
  "403": {
    title: "Forbidden",
    message: "Your clearance does not cover this directory. The file exists, but this operator cannot open it.",
  },
  "404": {
    title: "Page not found",
    message: "That uplink does not exist.",
  },
  "410": {
    title: "Gone",
    message: "This page used to exist and has been permanently removed. Search engines should drop the address.",
  },
  "500": {
    title: "Internal server error",
    message: "The grid hit an unexpected backend fault. The request was valid; the host failed while fulfilling it.",
  },
  "502": {
    title: "Bad gateway",
    message: "An upstream node returned an invalid response. The neural proxy could not complete the hop.",
  },
  "503": {
    title: "Service unavailable",
    message: "The host is overloaded or in a planned window. Retry shortly; no data was written.",
  },
  "504": {
    title: "Gateway timeout",
    message: "An upstream node took too long to answer, so the gateway stopped waiting.",
  },
} as const;

export type StatusCode = keyof typeof STATUS_PAGES;
