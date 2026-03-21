/**
 * Basic C/C++ comment stripping for boundary scanning (MVP = text scan).
 * Removes // and /* *\/ so symbol matches are not inside comments.
 */
export function stripCppComments(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inBlock = false;
  for (const line of lines) {
    let s = line;
    if (inBlock) {
      const end = s.indexOf("*/");
      if (end === -1) continue;
      s = s.slice(end + 2);
      inBlock = false;
    }
    let i = 0;
    let result = "";
    while (i < s.length) {
      if (s.slice(i, i + 2) === "/*") {
        const end = s.indexOf("*/", i + 2);
        if (end === -1) {
          inBlock = true;
          break;
        }
        i = end + 2;
        continue;
      }
      if (s.slice(i, i + 2) === "//") {
        break;
      }
      result += s[i];
      i++;
    }
    out.push(result);
  }
  return out.join("\n");
}
