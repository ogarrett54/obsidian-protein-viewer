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
			callback: () => {
				new PDBPromptModal(this.app).open();
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
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
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
		container.createEl("h4", { text: "This is a test" });
		const mount = container.createEl("div");
		mount.id = "molstar-container";

		this.viewer = await Viewer.create(mount, {
			layoutShowLog: false,
			layoutIsExpanded: false,
			layoutShowControls: true,
			layoutShowLeftPanel: false,
		});
	}

	async onClose() {}
}
