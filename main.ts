import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	ItemView,
	WorkspaceLeaf,
} from "obsidian";

import { Viewer } from "molstar/build/viewer/molstar";

export const VIEW_TYPE = "protein-viewer";

interface ProteinViewerSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: ProteinViewerSettings = {
	mySetting: "default",
};

export default class ProteinViewerPlugin extends Plugin {
	settings: ProteinViewerSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => new ProteinView(leaf));

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"flask-conical",
			"Protein Viewer",
			(evt: MouseEvent) => {
				new Notice("Opened Protein viewer!");
				this.activateView();
			}
		);

		// Open Modal and prompt for PDB ID to fetch from RCSB
		this.addCommand({
			id: "fetch-pdb-via-modal",
			name: "Fetch PDB via Modal",
			callback: async () => {
				// Activate or get the view
				await this.activateView();
				const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
				if (leaves.length > 0) {
					const view = leaves[0].view as ProteinView;
					view.promptAndLoadPdb();
				}
			},
		});

		// Use selected PDB ID in editor to fetch from RCSB
		this.addCommand({
			id: "fetch-pdb-via-selection",
			name: "Fetch PDB via Selection",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ProteinViewerSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE);

		if (leaves.length > 0) {
			// Use existing leaf if there is one
			leaf = leaves[0];
		} else {
			// Make a new leaf for it in the right sidebar
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
			workspace.revealLeaf(leaf);
		}
	}
}

class PDBPromptModal extends Modal {
	private inputEl: HTMLInputElement;
	public result: string | null = null;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h4", { text: "Enter PDB ID" });
		const inputContainer = contentEl.createEl("div");
		inputContainer.style.display = "flex";
		inputContainer.style.gap = "8px";
		this.inputEl = inputContainer.createEl("input", { type: "text" });
		this.inputEl.style.flex = "auto";
		this.inputEl.focus();

		inputContainer.createEl("button", { text: "Load" }).onClickEvent(() => {
			this.result = this.inputEl.value.trim().toUpperCase() || null;
			console.log(this.result);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ProteinViewerSettingTab extends PluginSettingTab {
	plugin: ProteinViewerPlugin;

	constructor(app: App, plugin: ProteinViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

export class ProteinView extends ItemView {
	private viewer: any;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE;
	}

	getDisplayText() {
		return "Protein Viewer";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "Protein Viewer" });
		const mount = container.createEl("div");
		mount.id = "molstar-container";

		this.viewer = await Viewer.create(mount, {
			layoutShowLog: false,
			layoutIsExpanded: false,
			layoutShowControls: true,
			layoutShowLeftPanel: false,
			layoutShowAnimation: false,
			layoutShowSequence: true,

			viewportShowSelectionMode: false,

			pdbProvider: "rcsb",
			emdbProvider: "rcsb",
		});
	}

	async onClose() {}

	async promptAndLoadPdb() {
		const modal = new PDBPromptModal(this.app);
		modal.open();

		await new Promise<void>((resolve) => {
			console.log("promise received");
			const oldOnClose = modal.onClose;
			modal.onClose = () => {
				oldOnClose.call(modal);
				resolve();
			};
		});

		const id = modal.result;
		if (!id) return;
		console.log("loading PDB");
		await this.viewer.loadPdb(id);
	}
}
