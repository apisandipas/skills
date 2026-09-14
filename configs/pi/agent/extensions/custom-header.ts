import { execFileSync } from "node:child_process";
import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

const LOGO = [
	"██████╗  ██╗",
	"██╔══██╗ ██║",
	"██████╔╝ ██║",
	"██╔═══╝  ██║",
	"██║      ██║",
	"╚═╝      ╚═╝",
];

function slashModel(ctx: { model?: { provider: string; id: string }; thinkingLevel?: string }): string {
	if (!ctx.model) return "model: none";
	const thinking = ctx.thinkingLevel && ctx.thinkingLevel !== "off" ? `:${ctx.thinkingLevel}` : "";
	return `${ctx.model.provider}/${ctx.model.id}${thinking}`;
}

function basename(path: string): string {
	return path.split("/").filter(Boolean).pop() ?? path;
}

function getGitBranch(cwd: string): string | undefined {
	try {
		const branch = execFileSync("git", ["-C", cwd, "branch", "--show-current"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		return branch || undefined;
	} catch {
		return undefined;
	}
}

function renderHeaderLines(theme: Theme, width: number, ctx: { cwd: string; model?: { provider: string; id: string }; thinkingLevel?: string }): string[] {
	const accent = (text: string) => theme.fg("accent", text);
	const muted = (text: string) => theme.fg("muted", text);
	const dim = (text: string) => theme.fg("dim", text);
	const good = (text: string) => theme.fg("success", text);

	const project = basename(ctx.cwd);
	const branch = getGitBranch(ctx.cwd);
	const leftWidth = Math.min(14, Math.max(0, width));
	const gap = width >= 72 ? "  " : " ";
	const info = [
		`${theme.bold("Bryan's pi")} ${dim(`v${VERSION}`)}`,
		`${muted("cwd")} ${project}${branch ? ` ${dim("on")} ${good(branch)}` : ""}`,
		`${muted("model")} ${slashModel(ctx)}`,
		`${dim("/builtin-header restores the stock header")}`,
	];

	return LOGO.map((line, index) => {
		const logo = accent(line.padEnd(leftWidth));
		const text = info[index] ?? "";
		return truncateToWidth(`${logo}${gap}${text}`, width, "");
	});
}

export default function (pi: ExtensionAPI) {
	function installHeader(ctx: Pick<ExtensionContext, "mode" | "cwd" | "model" | "thinkingLevel" | "ui">) {
		if (ctx.mode !== "tui") return;

		ctx.ui.setHeader((_tui, theme) => ({
			render(width: number): string[] {
				return renderHeaderLines(theme, width, ctx);
			},
			invalidate() {},
		}));
	}

	pi.on("session_start", async (_event, ctx) => installHeader(ctx));
	pi.on("model_select", async (_event, ctx) => installHeader(ctx));
	pi.on("thinking_level_select", async (_event, ctx) => installHeader(ctx));

	pi.registerCommand("custom-header", {
		description: "Show Bryan's pi header",
		handler: async (_args, ctx) => {
			installHeader(ctx);
			ctx.ui.notify("Custom header restored", "info");
		},
	});

	pi.registerCommand("builtin-header", {
		description: "Restore the built-in pi header",
		handler: async (_args, ctx) => {
			ctx.ui.setHeader(undefined);
			ctx.ui.notify("Built-in header restored", "info");
		},
	});
}
