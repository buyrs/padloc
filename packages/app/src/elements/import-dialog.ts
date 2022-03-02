import { Vault } from "@padloc/core/src/vault";
import { VaultItem, FIELD_DEFS } from "@padloc/core/src/item";
import { translate as $l } from "@padloc/locale/src/translate";
import * as imp from "../lib/import";
import { prompt, alert } from "../lib/dialog";
import { app } from "../globals";
import { Select } from "./select";
import { Dialog } from "./dialog";
import "./button";
import { customElement, query, state } from "lit/decorators.js";
import { html } from "lit";
import { saveFile } from "@padloc/core/src/platform";
import { stringToBytes } from "@padloc/core/src/encoding";

const fieldTypeOptions = Object.keys(FIELD_DEFS).map((fieldType) => ({
    name: FIELD_DEFS[fieldType].name as string,
    value: fieldType,
}));
// TODO: Remove this
console.log(fieldTypeOptions);

@customElement("pl-import-dialog")
export class ImportDialog extends Dialog<File, void> {
    @state()
    private _file: File;

    @state()
    private _items: VaultItem[] = [];

    @state()
    private _itemColumns: imp.ImportCSVColumn[] = [];

    @query("#formatSelect")
    private _formatSelect: Select<string>;

    @query("#vaultSelect")
    private _vaultSelect: Select<Vault>;

    renderContent() {
        return html`
            <div class="padded vertical spacing layout">
                <h1 class="big text-centering margined">${$l("Import Data")}</h1>

                <pl-select
                    id="formatSelect"
                    .options=${imp.supportedFormats}
                    .label=${$l("Format")}
                    @change=${this._parseData}
                    disabled
                ></pl-select>

                <div class="small padded" ?hidden=${this._formatSelect && this._formatSelect.value !== imp.CSV.value}>
                    ${$l("If you don't want to map columns to field types in the next step")}
                    <a href="#" @click=${this._downloadCSVSampleFile}> ${$l("Download Sample File")} </a>
                </div>

                <div
                    class="vertical evenly stretching spacing layout"
                    ?hidden=${this._formatSelect && this._formatSelect.value !== imp.CSV.value}
                >
                    TODO: List columns
                    ${this._itemColumns.map(
                        (itemColumn) => html`<p>${itemColumn.displayName}: (${itemColumn.name}:${itemColumn.type})</p>`
                    )}
                    TODO: Allow choosing field type per column TODO: Re-parse data with new columns after choosing field
                    types
                </div>

                <pl-select
                    id="vaultSelect"
                    .options=${app.vaults.map((v) => ({
                        disabled: !app.isEditable(v),
                        value: v,
                    }))}
                    .label=${$l("Target Vault")}
                ></pl-select>

                <div class="horizontal evenly stretching spacing layout">
                    <pl-button @click=${() => this._import()} class="primary" ?disabled=${!this._items.length}>
                        ${$l("Import {0} Items", this._items.length.toString())}
                    </pl-button>
                    <pl-button @click=${this.dismiss}> ${$l("Cancel")} </pl-button>
                </div>
            </div>
        `;
    }

    async show(file: File) {
        await this.updateComplete;
        const result = super.show();

        this._file = file;
        this._formatSelect.value = ((await imp.guessFormat(file)) || imp.CSV).value;
        await this._parseData();
        this._vaultSelect.value = app.mainVault!;

        return result;
    }

    private async _downloadCSVSampleFile(e: Event) {
        e.preventDefault();
        saveFile(
            `${process.env.PL_APP_NAME}_csv_import_sample.csv`,
            "text/csv",
            stringToBytes(`name,tags,url,username,password,notes
Facebook,social,https://facebook.com/,john.doe@gmail.com,3kjaf93,"Some note..."
Github,"work,coding",https://github.com,john.doe@gmail.com,129lskdf93`)
        );
    }

    private async _parseData(): Promise<void> {
        const file = this._file;

        switch (this._formatSelect.value) {
            case imp.PADLOCK_LEGACY.value:
                this.open = false;
                const pwd = await prompt($l("This file is protected by a password."), {
                    title: $l("Enter Password"),
                    placeholder: $l("Enter Password"),
                    type: "password",
                    validate: async (pwd: string) => {
                        try {
                            this._items = await imp.asPadlockLegacy(file, pwd);
                        } catch (e) {
                            throw $l("Wrong Password");
                        }
                        return pwd;
                    },
                });
                this.open = true;

                if (pwd === null) {
                    this.done();
                }
                break;
            case imp.LASTPASS.value:
                this._items = await imp.asLastPass(file);
                break;
            case imp.CSV.value:
                this._itemColumns = await imp.asCSVColumns(file);
                this._items = await imp.asCSV(file);
                break;
            case imp.ONEPUX.value:
                this._items = await imp.as1Pux(file);
                break;
            case imp.PBES2.value:
                this.open = false;
                const pwd2 = await prompt($l("This file is protected by a password."), {
                    title: $l("Enter Password"),
                    placeholder: $l("Enter Password"),
                    type: "password",
                    validate: async (pwd: string) => {
                        try {
                            this._items = await imp.asPBES2Container(file, pwd);
                        } catch (e) {
                            throw $l("Wrong Password");
                        }
                        return pwd;
                    },
                });
                this.open = true;

                if (pwd2 === null) {
                    this.done();
                }
                break;
            default:
                this._items = [];
        }
    }

    private async _import() {
        const vault = this._vaultSelect.value!;
        const quota = app.getItemsQuota(vault);

        if (quota !== -1 && vault.items.size + this._items.length > quota) {
            this.done();
            alert($l("The number of imported items exceeds your remaining quota."), { type: "warning" });
            return;
        }

        app.addItems(this._items, vault);
        // this.dispatch("data-imported", { items: items });
        this.done();
        alert($l("Successfully imported {0} items.", this._items.length.toString()), { type: "success" });
    }
}
