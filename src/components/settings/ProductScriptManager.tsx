"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Bold,
  CheckCircle2,
  Eye,
  FileText,
  Highlighter,
  History,
  Italic,
  LoaderCircle,
  Minus,
  Pencil,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";
import {
  createProductScriptDraftAction,
  getProductScriptAction,
  publishProductScriptVersionAction,
} from "@/app/actions/productScripts";
import type { ProductScriptDTO, ProductScriptVersionDTO } from "@/lib/dal/productScripts";
import type { Product } from "@/lib/products";
import { buildDefaultScriptHtml, sanitizeScriptHtml } from "@/lib/scriptContent";

interface ProductScriptManagerProps {
  products: Product[];
  initialScripts: ProductScriptDTO[];
  initialVersions: ProductScriptVersionDTO[];
}

const ALLOWED_EDITOR_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "mark",
  "ul",
  "ol",
  "li",
  "hr",
]);

function normalizeEditorMarkup(value: string): string {
  if (typeof window === "undefined") return value;

  const parsed = new DOMParser().parseFromString(value, "text/html");

  const normalizeNode = (node: Node): Node[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      return [parsed.createTextNode(node.textContent || "")];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).flatMap(normalizeNode);

    if (tagName === "font" || tagName === "span") {
      const style = element.getAttribute("style") || "";
      const isHighlight = /(?:background|background-color)\s*:/i.test(style);
      if (isHighlight) {
        const mark = parsed.createElement("mark");
        children.forEach((child) => mark.appendChild(child));
        return [mark];
      }
      return children;
    }

    if (!ALLOWED_EDITOR_TAGS.has(tagName)) return children;

    const cleanElement = parsed.createElement(tagName);
    children.forEach((child) => cleanElement.appendChild(child));
    return [cleanElement];
  };

  const cleanBody = parsed.createElement("div");
  Array.from(parsed.body.childNodes)
    .flatMap(normalizeNode)
    .forEach((child) => cleanBody.appendChild(child));

  return sanitizeScriptHtml(cleanBody.innerHTML);
}

function getLatestVersion(productId: string, versions: ProductScriptVersionDTO[]) {
  return versions
    .filter((version) => version.product_id === productId)
    .sort((left, right) => right.version_number - left.version_number)[0];
}

function getVersionStatusLabel(status: ProductScriptVersionDTO["status"]): string {
  return status === "published" ? "Published" : status === "archived" ? "Archived" : "Draft";
}

function getScriptHtml(
  product: Product,
  scripts: ProductScriptDTO[],
  versions: ProductScriptVersionDTO[],
): string {
  const latestVersion = getLatestVersion(product.id, versions);
  const savedScript = scripts.find((script) => script.product_id === product.id);
  return sanitizeScriptHtml(
    latestVersion?.content_html || savedScript?.content_html || buildDefaultScriptHtml(product),
  );
}

export function ProductScriptManager({ products, initialScripts, initialVersions }: ProductScriptManagerProps) {
  const firstProduct = products[0];
  const [selectedProductId, setSelectedProductId] = useState(firstProduct?.id || "");
  const [scripts, setScripts] = useState(initialScripts);
  const [versions, setVersions] = useState(initialVersions);
  const [activeVersionId, setActiveVersionId] = useState(() =>
    firstProduct ? getLatestVersion(firstProduct.id, initialVersions)?.id || null : null,
  );
  const [editorHtml, setEditorHtml] = useState(() =>
    firstProduct ? getScriptHtml(firstProduct, initialScripts, initialVersions) : "",
  );
  const [isPreview, setIsPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLDivElement>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );
  const productVersions = useMemo(
    () =>
      selectedProduct
        ? versions
            .filter((version) => version.product_id === selectedProduct.id)
            .sort((left, right) => right.version_number - left.version_number)
        : [],
    [selectedProduct, versions],
  );
  const activeVersion = productVersions.find((version) => version.id === activeVersionId) || null;
  const hasSavedScript = Boolean(
    selectedProduct &&
      (scripts.some((script) => script.product_id === selectedProduct.id) ||
        productVersions.some((version) => version.status === "published")),
  );

  const selectProduct = (product: Product) => {
    if (isPending) return;
    if (hasChanges) {
      setFeedback({ tone: "error", message: "Save or reset the current script before switching products." });
      return;
    }
    setSelectedProductId(product.id);
    const nextVersion = getLatestVersion(product.id, versions);
    setActiveVersionId(nextVersion?.id || null);
    const nextHtml = getScriptHtml(product, scripts, versions);
    setEditorHtml(nextHtml);
    if (editorRef.current) editorRef.current.innerHTML = nextHtml;
    setHasChanges(false);
    setFeedback(null);
    setIsPreview(false);
  };

  const selectVersion = (version: ProductScriptVersionDTO) => {
    if (isPending) return;
    if (hasChanges) {
      setFeedback({ tone: "error", message: "Save or reset the current script before switching versions." });
      return;
    }
    const nextHtml = sanitizeScriptHtml(version.content_html);
    setActiveVersionId(version.id);
    setEditorHtml(nextHtml);
    if (editorRef.current) editorRef.current.innerHTML = nextHtml;
    setIsPreview(false);
    setFeedback(null);
  };

  const applyFormat = (
    command: "bold" | "italic" | "hiliteColor" | "insertHorizontalRule",
    value?: string,
  ) => {
    if (isPreview || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setHasChanges(true);
  };

  const resetToDefault = () => {
    if (!selectedProduct || isPending) return;
    const fallbackHtml = buildDefaultScriptHtml(selectedProduct);
    setEditorHtml(fallbackHtml);
    if (editorRef.current) editorRef.current.innerHTML = fallbackHtml;
    setHasChanges(true);
    setFeedback(null);
  };

  const save = () => {
    if (!selectedProduct || isPending) return;

    const rawHtml = editorRef.current?.innerHTML || editorHtml;
    const cleanHtml = normalizeEditorMarkup(rawHtml);
    if (!cleanHtml) {
      setFeedback({ tone: "error", message: "Script cannot be empty." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      try {
        const draft = await createProductScriptDraftAction(selectedProduct.id, cleanHtml);
        setVersions((current) => [
          ...current.filter((version) => version.id !== draft.id),
          draft,
        ]);
        setActiveVersionId(draft.id);
        setEditorHtml(draft.content_html);
        setHasChanges(false);
        setFeedback({ tone: "success", message: `Draft v${draft.version_number} saved. Publish it when it is ready for operators.` });
      } catch (error) {
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "Script could not be saved.",
        });
      }
    });
  };

  const publish = () => {
    if (!selectedProduct || !activeVersion || activeVersion.status !== "draft" || hasChanges || isPending) return;

    setFeedback(null);
    startTransition(async () => {
      try {
        const published = await publishProductScriptVersionAction(activeVersion.id);
        const publishedScript = await getProductScriptAction(selectedProduct.id);
        setVersions((current) =>
          current.map((version) => {
            if (version.product_id !== published.product_id) return version;
            if (version.id === published.id) return published;
            return version.status === "published" ? { ...version, status: "archived" as const } : version;
          }),
        );
        if (publishedScript) {
          setScripts((current) => [
            ...current.filter((script) => script.product_id !== publishedScript.product_id),
            publishedScript,
          ]);
        }
        setActiveVersionId(published.id);
        setEditorHtml(published.content_html);
        setHasChanges(false);
        setFeedback({ tone: "success", message: `Version v${published.version_number} is now published to the Operator Console.` });
      } catch (error) {
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "Script version could not be published.",
        });
      }
    });
  };

  if (!selectedProduct) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <FileText className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">No products available</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
          Add a product to the catalog before creating an approved operator script.
        </p>
        <a
          href="/settings"
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <a
            href="/settings"
            className="mt-0.5 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            aria-label="Back to settings"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              <span>Settings</span>
              <span>/</span>
              <span>Product Scripts</span>
            </div>
            <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-zinc-100">
              <FileText className="h-5 w-5 text-zinc-400" />
              Script Administration
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
              Edit one continuous script per product, save a draft, then publish the reviewed version to operators.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
          Administrator only
        </span>
      </div>

      <div className="grid min-h-[620px] gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-sm xl:sticky xl:top-0">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Products</h2>
              <p className="mt-1 text-[11px] text-zinc-500">Choose a script to edit.</p>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">{products.length}</span>
          </div>
          <div className="space-y-1.5">
            {products.map((product) => {
              const isSelected = product.id === selectedProduct.id;
              const isSaved =
                scripts.some((script) => script.product_id === product.id) ||
                versions.some(
                  (version) => version.product_id === product.id && version.status === "published",
                );
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-zinc-600 bg-zinc-950 text-zinc-100"
                      : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-950/70 hover:text-zinc-200"
                  }`}
                >
                  <span className="block truncate text-xs font-medium">{product.title}</span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                    <span className="capitalize">{product.category}</span>
                    {isSaved ? <span className="text-emerald-400">Published</span> : <span>Fallback</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                <span>Product Script</span>
                <span className="rounded-full border border-zinc-800 px-2 py-0.5 normal-case tracking-normal text-zinc-400">
                  {activeVersion
                    ? `${getVersionStatusLabel(activeVersion.status)} · v${activeVersion.version_number}`
                    : hasSavedScript
                      ? "Published"
                      : "Fallback preview"}
                </span>
              </div>
              <h2 className="truncate text-lg font-semibold text-zinc-100">{selectedProduct.title}</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {selectedProduct.description || "No product description available."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPreview((current) => !current)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
              >
                {isPreview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {isPreview ? "Edit" : "Preview"}
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset fallback
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={isPending || isPreview || hasChanges || activeVersion?.status !== "draft"}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-900/70 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200 transition-colors hover:border-emerald-800 hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Publish version
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] font-medium text-zinc-300">Version history</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">{productVersions.length} versions</span>
            </div>
            {productVersions.length ? (
              <div className="flex flex-wrap gap-2">
                {productVersions.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => selectVersion(version)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[10px] transition-colors ${
                      version.id === activeVersionId
                        ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    v{version.version_number} · {getVersionStatusLabel(version.status)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-zinc-600">No saved versions yet. The editor is showing the built-in fallback.</p>
            )}
          </div>

          {!isPreview && (
            <div className="mt-5 flex flex-wrap items-center gap-1 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-1.5">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat("bold")}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="Bold"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat("italic")}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="Italic"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat("hiliteColor", "#facc15")}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="Highlight"
                title="Highlight"
              >
                <Highlighter className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat("insertHorizontalRule")}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="Insert horizontal rule"
                title="Insert horizontal rule"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="mx-1 h-5 w-px bg-zinc-800" />
              <span className="px-2 text-[11px] text-zinc-500">Formatting applies to the approved workspace script after Save.</span>
            </div>
          )}

          {feedback && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs ${
                feedback.tone === "success"
                  ? "border-emerald-900/60 bg-emerald-950/20 text-emerald-200"
                  : "border-rose-900/60 bg-rose-950/20 text-rose-200"
              }`}
              role={feedback.tone === "error" ? "alert" : "status"}
            >
              {feedback.tone === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              {feedback.message}
            </div>
          )}

          {isPreview ? (
            <article
              className="mt-5 min-h-[470px] rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 text-sm leading-7 text-zinc-200 [&_hr]:my-6 [&_hr]:border-zinc-700 [&_li]:ml-5 [&_li]:pl-1 [&_mark]:rounded [&_mark]:bg-amber-300/80 [&_mark]:px-0.5 [&_p]:my-4 [&_strong]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal"
              dangerouslySetInnerHTML={{ __html: editorHtml }}
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => setHasChanges(true)}
              className="mt-5 min-h-[470px] rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 text-sm leading-7 text-zinc-200 outline-none transition-colors focus:border-zinc-600 [&_hr]:my-6 [&_hr]:border-zinc-700 [&_li]:ml-5 [&_li]:pl-1 [&_mark]:rounded [&_mark]:bg-amber-300/80 [&_mark]:px-0.5 [&_p]:my-4 [&_strong]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal"
              dangerouslySetInnerHTML={{ __html: editorHtml }}
            />
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-zinc-800/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-zinc-500">
              {hasChanges ? "Unsaved changes" : "No unsaved changes"}. Save creates a draft; publishing updates the operator-facing script. HTML is reduced to safe text formatting before it is stored.
            </p>
            <button
              type="button"
              onClick={save}
              disabled={isPending || isPreview || !hasChanges}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPending ? "Saving…" : "Save draft"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
