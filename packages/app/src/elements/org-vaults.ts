import { translate as $l } from "@padloc/locale/src/translate";
import { VaultID } from "@padloc/core/src/vault";
import { StateMixin } from "../mixins/state";
import { Routing } from "../mixins/routing";
import { app } from "../globals";
import { shared } from "../styles";
import { BaseElement, element, html, property } from "./base";
import "./vault-item";
import "./icon";
import "./vault-view";
import "./list";
import "./popover";

@element("pl-org-vaults")
export class OrgVaultsView extends Routing(StateMixin(BaseElement)) {
    readonly routePattern = /^orgs\/([^\/]+)\/vaults(?:\/([^\/]+))?/;

    @property()
    orgId: string = "";

    @property()
    vaultId?: string;

    private get _org() {
        return app.getOrg(this.orgId);
    }

    handleRoute([orgId, vaultId]: [string, string]) {
        this.orgId = orgId;
        this.vaultId = vaultId;
    }

    private async _toggleVault(vault: { id: VaultID }) {
        if (this.vaultId === vault.id) {
            this.go(`orgs/${this.orgId}/vaults/`);
        } else {
            this.go(`orgs/${this.orgId}/vaults/${vault.id}`);
        }
    }

    private async _createVault() {
        this.go(`orgs/${this.orgId}/vaults/new`);
    }

    static styles = [shared];

    render() {
        if (!this._org) {
            return;
        }

        const org = this._org;
        const vaults = org.vaults;
        const isAdmin = org.isAdmin(app.account!);

        return html`
            <div class="fullbleed pane layout background ${this.vaultId ? "open" : ""}">
                <div class="vertical layout">
                    <header class="padded center-aligning horizontal layout">
                        <pl-button
                            label="${$l("Menu")}"
                            class="transparent slim narrow-only"
                            @click=${() => this.dispatch("toggle-menu")}
                        >
                            <pl-icon icon="menu"></pl-icon>
                        </pl-button>

                        <pl-button class="transparent skinny">
                            <div class="text-left-aligning">
                                <div class="highlight tiny">${org.name}/</div>
                                <div>${$l("Vaults")}</div>
                            </div>
                            <pl-icon icon="dropdown" class="small"></pl-icon>
                        </pl-button>

                        <pl-popover class="padded" alignment="right-bottom" hide-on-leave>
                            <pl-list role="nav">
                                <div
                                    class="padded spacing horizontal center-aligning layout list-item hover click"
                                    role="link"
                                    @click=${() => this.go(`orgs/${org.id}/members`)}
                                >
                                    <pl-icon icon="members"></pl-icon>
                                    <div>${$l("Members")}</div>
                                </div>
                                <div
                                    class="padded spacing horizontal center-aligning layout list-item hover click"
                                    role="link"
                                    @click=${() => this.go(`orgs/${org.id}/invites`)}
                                >
                                    <pl-icon icon="mail"></pl-icon>
                                    <div>${$l("Invites")}</div>
                                </div>
                                <div
                                    class="padded spacing horizontal center-aligning layout list-item hover click"
                                    role="link"
                                    @click=${() => this.go(`orgs/${org.id}/groups`)}
                                >
                                    <pl-icon icon="group"></pl-icon>
                                    <div>${$l("Groups")}</div>
                                </div>
                                <div
                                    class="padded spacing horizontal center-aligning layout list-item hover click"
                                    role="link"
                                    @click=${() => this.go(`orgs/${org.id}/settings`)}
                                >
                                    <pl-icon icon="settings"></pl-icon>
                                    <div>${$l("Settings")}</div>
                                </div>
                            </pl-list>
                        </pl-popover>

                        <div class="stretch"></div>

                        <pl-button class="transparent slim" @click=${() => this._createVault()} ?hidden=${!isAdmin}>
                            <pl-icon icon="add"></pl-icon>
                        </pl-button>
                    </header>

                    <pl-scroller class="stretch">
                        <pl-list>
                            ${vaults.map(
                                (vault) => html`
                                    <div
                                        class="padded list-item horizontally-margined hover click"
                                        ?aria-selected=${vault.id === this.vaultId}
                                        @click=${() => this._toggleVault(vault)}
                                    >
                                        <pl-vault-item .vault=${vault} .org=${this._org}></pl-vault-item>
                                    </div>
                                `
                            )}
                        </pl-list>
                    </pl-scroller>
                </div>

                <pl-vault-view></pl-vault-view>
            </div>
        `;
    }
}