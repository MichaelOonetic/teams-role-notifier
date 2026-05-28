export function renderTemplate(
  template: string,
  context: Record<string, string>
) {
  return template.replace(/\{([^}]+)\}/g, (_, key) => {
    return context[key] ?? "";
  });
}