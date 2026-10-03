export function borderTitleFragment(markup, document) {
  const template = document.createElement("template");
  template.innerHTML = String(markup ?? "");
  template.content.querySelectorAll("script, style, iframe, object, embed, link, meta, base, form, input, button, textarea, select, svg, math, template").forEach(element => element.remove());
  const tags = new Set(["B", "STRONG", "I", "EM", "U", "S", "SMALL", "SPAN", "BR", "SUB", "SUP", "DIV", "P"]);
  const styles = new Set(["color", "background-color", "font-weight", "font-style", "font-size", "font-family", "text-decoration"]);
  for (const element of [...template.content.querySelectorAll("*")]) {
    if (!tags.has(element.tagName)) { element.replaceWith(...element.childNodes); continue; }
    const style = element.style.cssText;
    for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
    const parsed = document.createElement("span").style; parsed.cssText = style;
    for (const key of styles) {
      const value = parsed.getPropertyValue(key);
      if (value && !/url\s*\(|expression\s*\(|var\s*\(/i.test(value)) element.style.setProperty(key, value);
    }
  }
  return template.content;
}

export function borderAppearance(widget, lightTheme = false) {
  const themeBackground = lightTheme ? "#FFFFFF" : "#000000";
  const height = Math.max(0, Math.min(100, Number(widget.headerHeight) || 0));
  return {
    header: { height: `${height}px`, backgroundColor: widget.headerColor || themeBackground },
    title: {
      top: `${widget.titleTopOffset ?? -10}px`, left: `${widget.titleLeftOffset ?? 20}px`,
      backgroundColor: widget.titleBackground || (height ? "transparent" : themeBackground),
      color: widget.titleColor || "inherit",
    },
  };
}
