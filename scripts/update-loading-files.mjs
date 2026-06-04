import fs from "fs";
import { globSync } from "fs";

const files = globSync("src/app/**/loading.tsx", { recursive: true });

for (const f of files) {
  const content = fs.readFileSync(f, "utf8");
  const labelMatch = content.match(/label=["']([^"']+)["']/);
  const label = labelMatch?.[1];
  const fnMatch = content.match(/export default function (\w+)/);
  const fnName = fnMatch?.[1] ?? "Loading";

  const body = label
    ? `  return <PageLoader label="${label}" />;`
    : "  return <PageLoader />;";

  const out = `import { PageLoader } from "@/components/ui/page-loader";

export default function ${fnName}() {
${body}
}
`;

  fs.writeFileSync(f, out);
  console.log("updated", f, label ?? "(no label)");
}
