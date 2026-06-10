import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/app", "src/components", "src/features", "src/lib"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md"]);
const MOJIBAKE = /Ãƒ|Ã‚|ï¿½|Ã¢(?:â‚¬|â‚¬â„¢|â‚¬Å“|â‚¬ï¿½|â‚¬â€œ|â‚¬â€|â€ )/;

const ACCENT_WORDS = [
  ["catalogo", "catÃ¡logo"],
  ["categoria", "categorÃ­a"],
  ["categorias", "categorÃ­as"],
  ["creacion", "creaciÃ³n"],
  ["edicion", "ediciÃ³n"],
  ["remision", "remisiÃ³n"],
  ["presentacion", "presentaciÃ³n"],
  ["produccion", "producciÃ³n"],
  ["ubicacion", "ubicaciÃ³n"],
  ["accion", "acciÃ³n"],
  ["configuracion", "configuraciÃ³n"],
  ["descripcion", "descripciÃ³n"],
  ["tecnica", "tÃ©cnica"],
  ["rapido", "rÃ¡pido"],
  ["automatico", "automÃ¡tico"],
  ["automaticamente", "automÃ¡ticamente"],
  ["minimo", "mÃ­nimo"],
  ["invalido", "invÃ¡lido"],
  ["todavia", "todavÃ­a"],
  ["despues", "despuÃ©s"],
  ["busqueda", "bÃºsqueda"],
  ["fisica", "fÃ­sica"],
  ["fisicas", "fÃ­sicas"],
  ["logica", "lÃ³gica"],
  ["logistica", "logÃ­stica"],
];

const CODE_TOKEN_CONTEXT = /(?:const|let|var|function|type|interface|import|from|return|if|else|await|async|new|class)\b/;
const TECHNICAL_TEXT_CONTEXT =
  /type="hidden"|name="view_mode"|value="catalogo"|value: "logistica"|viewMode|view_mode|buildHubHref|hash:|"nevera-produccion"|"sin-ubicacion"|normalized\.includes|normalizedId|return base \|\| "categoria"/;

function walk(dir) {
  const entries = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) entries.push(...walk(path));
    else if (EXTENSIONS.has(path.slice(path.lastIndexOf(".")))) entries.push(path);
  }
  return entries;
}

function looksLikeVisibleText(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) return false;
  if (TECHNICAL_TEXT_CONTEXT.test(trimmed)) return false;
  if (trimmed.includes("className=") && !trimmed.includes(">")) return false;
  if (CODE_TOKEN_CONTEXT.test(trimmed) && !trimmed.includes('"') && !trimmed.includes("'") && !trimmed.includes(">")) {
    return false;
  }
  return /["'`>][^"'`<>{}]*[A-Za-zÃÃ‰ÃÃ“ÃšÃœÃ‘Ã¡Ã©Ã­Ã³ÃºÃ¼Ã±]{3,}/.test(trimmed);
}

const findings = [];
for (const root of ROOTS) {
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) continue;
  for (const file of walk(root)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (MOJIBAKE.test(line)) {
        findings.push({ file, line: index + 1, type: "mojibake", text: line.trim() });
        return;
      }
      if (!looksLikeVisibleText(line)) return;
      const lower = line.toLocaleLowerCase("es-CO");
      for (const [plain, expected] of ACCENT_WORDS) {
        const pattern = new RegExp(`\\b${plain}\\b`, "i");
        if (pattern.test(lower)) {
          findings.push({
            file,
            line: index + 1,
            type: "accent-review",
            text: `${line.trim()}  [revisar: ${plain} -> ${expected}]`,
          });
          break;
        }
      }
    });
  }
}

const mojibakeFindings = findings.filter((item) => item.type === "mojibake");
const accentFindings = findings.filter((item) => item.type === "accent-review");

if (findings.length) {
  for (const item of findings.slice(0, 200)) {
    console.log(`${relative(process.cwd(), item.file)}:${item.line}: ${item.type}: ${item.text}`);
  }
  if (findings.length > 200) {
    console.log(`... ${findings.length - 200} hallazgo(s) adicional(es).`);
  }
  console.log(
    `\nResumen: ${mojibakeFindings.length} mojibake, ${accentFindings.length} revisiÃ³n(es) de tildes.`
  );
  process.exitCode = mojibakeFindings.length > 0 ? 1 : 0;
} else {
  console.log("Sin mojibake ni palabras frecuentes sin tilde en textos visibles.");
}

