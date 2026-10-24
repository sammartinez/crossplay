export const withParams = (base: string, params: Record<string, string>): string =>
  `${base}?${new URLSearchParams(params)}`
